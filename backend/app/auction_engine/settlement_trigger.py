import logging
from datetime import datetime, timezone
from bson import ObjectId
from app import extensions
from app.models.trade import Trade

logger = logging.getLogger(__name__)


def calculate_pro_rata_shares(constituent_listings, trade_quantity_kg, clearing_price_per_kg):
    """
    Computes exact pro-rata volume and payout allocation for each participating farmer.

    Args:
      constituent_listings: list of produce_listing dicts belonging to the pooled batch.
      trade_quantity_kg: float, total volume filled in this trade.
      clearing_price_per_kg: float, clearing price in ₹/kg.

    Returns:
      list of dicts: [
        {
          'farmer_id': ObjectId,
          'listing_id': ObjectId,
          'quantity_kg': float,
          'payout_amount': float,
        }
      ]
    """
    if not constituent_listings:
        return []

    # Get remaining quantity per listing (fallback to quantity_kg)
    listing_weights = []
    for l in constituent_listings:
        q = float(l.get('quantity_remaining_kg') if l.get('quantity_remaining_kg') is not None else l.get('quantity_kg', 0))
        listing_weights.append((l, max(0.0, q)))

    total_available_weight = sum(w for _, w in listing_weights)
    if total_available_weight <= 0:
        # Fallback: equal weight if all remaining weights are 0
        total_available_weight = float(len(constituent_listings))
        listing_weights = [(l, 1.0) for l, _ in listing_weights]

    shares = []
    running_qty = 0.0
    running_payout = 0.0

    total_trade_amount = round(trade_quantity_kg * clearing_price_per_kg, 2)

    for i, (listing, weight) in enumerate(listing_weights):
        # If this is the last listing, assign the exact remainder to prevent rounding drift
        if i == len(listing_weights) - 1:
            share_qty = round(trade_quantity_kg - running_qty, 2)
            share_payout = round(total_trade_amount - running_payout, 2)
        else:
            fraction = weight / total_available_weight
            share_qty = round(trade_quantity_kg * fraction, 2)
            share_payout = round(share_qty * clearing_price_per_kg, 2)
            running_qty += share_qty
            running_payout += share_payout

        shares.append({
            'farmer_id': ObjectId(listing['farmer_id']),
            'listing_id': ObjectId(listing['_id']),
            'quantity_kg': max(0.0, share_qty),
            'payout_amount': max(0.0, share_payout),
        })

    return shares


def execute_match_trade(match, auction_round_id, db=None):
    """
    Executes a single matched trade proposal:
      1. Computes pro-rata farmer shares.
      2. Creates Trade document in DB with status 'pending_payment'.
      3. Updates Bid remaining quantity and status ('matched' or 'partially_matched').
      4. Updates PooledBatch remaining quantity and status ('matched' or 'partially_matched').
      5. Decrements each listing's quantity_remaining_kg.

    Returns:
      Created trade document.
    """
    if db is None:
        db = extensions.db

    now = datetime.now(timezone.utc).isoformat()
    pooled_batch = match['pooled_batch']
    bid_doc = match['bid_doc']
    clearing_price = float(match['clearing_price_per_kg'])
    trade_qty = float(match['quantity_kg'])
    total_amount = float(match['total_amount'])

    batch_id = ObjectId(pooled_batch['_id'])
    bid_id = ObjectId(bid_doc['_id'])
    crop = match.get('crop') or pooled_batch.get('crop') or bid_doc.get('crop')

    # Fetch constituent listings for the pooled batch
    listing_ids = [ObjectId(lid) for lid in pooled_batch.get('listing_ids', [])]
    constituent_listings = list(db.produce_listings.find({'_id': {'$in': listing_ids}}))

    # Calculate pro-rata shares
    farmer_shares = calculate_pro_rata_shares(constituent_listings, trade_qty, clearing_price)

    # 1. Create Trade document
    trade_data = {
        'auction_round_id': ObjectId(auction_round_id),
        'buyer_id': ObjectId(bid_doc['buyer_id']),
        'pooled_batch_id': batch_id,
        'farmer_shares': farmer_shares,
        'crop': crop,
        'quantity_kg': trade_qty,
        'clearing_price_per_kg': clearing_price,
        'total_amount': total_amount,
        'status': 'pending_payment',
        'created_at': now,
        'settled_at': None,
    }
    trade_res = db.trades.insert_one(trade_data)
    trade_data['_id'] = trade_res.inserted_id

    # 2. Update Bid
    current_bid = db.bids.find_one({'_id': bid_id})
    if current_bid:
        rem_bid = float(current_bid.get('quantity_remaining_kg', current_bid.get('quantity_needed_kg', trade_qty)))
        new_rem_bid = max(0.0, round(rem_bid - trade_qty, 2))
        new_bid_status = 'matched' if new_rem_bid <= 0.0 else 'partially_matched'
        db.bids.update_one(
            {'_id': bid_id},
            {'$set': {'quantity_remaining_kg': new_rem_bid, 'status': new_bid_status, 'updated_at': now}}
        )

    # 3. Update PooledBatch
    current_batch = db.pooled_batches.find_one({'_id': batch_id})
    if current_batch:
        rem_batch = float(current_batch.get('quantity_remaining_kg', current_batch.get('total_quantity_kg', trade_qty)))
        new_rem_batch = max(0.0, round(rem_batch - trade_qty, 2))
        new_batch_status = 'matched' if new_rem_batch <= 0.0 else 'partially_matched'
        db.pooled_batches.update_one(
            {'_id': batch_id},
            {'$set': {'quantity_remaining_kg': new_rem_batch, 'status': new_batch_status}}
        )

    # 4. Update individual constituent listings
    for share in farmer_shares:
        lid = share.get('listing_id')
        share_vol = share.get('quantity_kg', 0.0)
        if lid:
            cur_listing = db.produce_listings.find_one({'_id': lid})
            if cur_listing:
                rem_l = float(cur_listing.get('quantity_remaining_kg', cur_listing.get('quantity_kg', share_vol)))
                new_rem_l = max(0.0, round(rem_l - share_vol, 2))
                new_listing_status = 'matched' if new_rem_l <= 0.0 else 'pooled'
                db.produce_listings.update_one(
                    {'_id': lid},
                    {'$set': {'quantity_remaining_kg': new_rem_l, 'status': new_listing_status, 'updated_at': now}}
                )

    logger.info(
        "Trade %s executed: %s kg of %s at ₹%s/kg (Total: ₹%s) between Buyer %s and Batch %s",
        trade_data['_id'], trade_qty, crop, clearing_price, total_amount, bid_doc['buyer_id'], batch_id
    )

    return trade_data


def trigger_settlement_for_matches(auction_round_id, matches, db=None):
    """
    Triggers settlement execution for all matched proposals in an auction round.
    """
    if db is None:
        db = extensions.db

    created_trades = []
    for match in matches:
        trade_doc = execute_match_trade(match, auction_round_id, db=db)
        created_trades.append(trade_doc)

    return created_trades
