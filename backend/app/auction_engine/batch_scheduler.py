import logging
from datetime import datetime, timezone
from bson import ObjectId
from flask import current_app

from app import extensions
from app.models.auction_round import AuctionRound
from app.auction_engine.pooling import pool_open_listings
from app.auction_engine.matcher import match_auction_orderbook
from app.auction_engine.settlement_trigger import trigger_settlement_for_matches

logger = logging.getLogger(__name__)


def run_auction_round_for_crop(crop_name, window_start=None, window_end=None, db=None):
    """
    Executes a single double-auction round for a specific crop.
    1. Loads supply (open/partially_matched pooled batches for crop).
    2. Loads demand (open/partially_matched bids for crop).
    3. Matches order book using classic double-auction rules.
    4. Records AuctionRound and creates Trades with pro-rata farmer shares.
    """
    if db is None:
        db = extensions.db
        if db is None:
            raise RuntimeError("Database connection not initialized.")

    now = datetime.now(timezone.utc)
    start_iso = (window_start or now).isoformat()
    end_iso = (window_end or now).isoformat()

    # 1. Supply side: open or partially matched pooled batches
    raw_batches = list(db.pooled_batches.find({
        'crop': {'$regex': f"^{crop_name}$", '$options': 'i'},
        'status': {'$in': ['open', 'partially_matched']},
    }))

    asks = []
    for b in raw_batches:
        rem_qty = float(b.get('quantity_remaining_kg', b.get('total_quantity_kg', 0)))
        if rem_qty <= 0:
            continue

        # Look up constituent listings to determine effective minimum ask price
        listing_ids = [ObjectId(lid) for lid in b.get('listing_ids', [])]
        constituent_listings = list(db.produce_listings.find({'_id': {'$in': listing_ids}}))

        if constituent_listings:
            # Maximum ask price among listings ensures all participating farmers are satisfied
            batch_ask_price = max(float(l.get('ask_price_per_kg', 0)) for l in constituent_listings)
        elif b.get('ask_price_per_kg') is not None:
            batch_ask_price = float(b['ask_price_per_kg'])
        else:
            batch_ask_price = 0.0

        asks.append({
            'id': b['_id'],
            'pooled_batch': b,
            'ask_price_per_kg': batch_ask_price,
            'quantity_remaining_kg': rem_qty,
            'quality_grade': b.get('quality_grade', 'C'),
            'created_at': b.get('created_at', ''),
        })

    # 2. Demand side: open or partially matched bids
    raw_bids = list(db.bids.find({
        'crop': {'$regex': f"^{crop_name}$", '$options': 'i'},
        'status': {'$in': ['open', 'partially_matched']},
    }))

    bids = []
    for bid in raw_bids:
        rem_qty = float(bid.get('quantity_remaining_kg', bid.get('quantity_needed_kg', 0)))
        if rem_qty <= 0:
            continue

        bids.append({
            'id': bid['_id'],
            'bid_doc': bid,
            'max_price_per_kg': float(bid.get('max_price_per_kg', 0)),
            'quantity_remaining_kg': rem_qty,
            'min_quality_grade': bid.get('min_quality_grade', 'C'),
            'buyer_id': bid['buyer_id'],
            'created_at': bid.get('created_at', ''),
        })

    # 3. Create initial scheduled/running AuctionRound document
    round_doc = AuctionRound.create({
        'crop': crop_name,
        'window_start': start_iso,
        'window_end': end_iso,
        'status': 'running',
    })
    round_id = round_doc['_id']

    # 4. Match order book
    matches = match_auction_orderbook(asks, bids)

    if not matches:
        # Edge Case 1: No match in window -> mark no_match, bids and asks carry forward
        AuctionRound.mark_no_match(round_id)
        round_doc['status'] = 'no_match'
        round_doc['clearing_price_per_kg'] = None
        round_doc['matched_trade_ids'] = []
        logger.info("Auction round %s for %s completed with no matches (open supply/demand carries forward)", round_id, crop_name)
        return round_doc, []

    # 5. Settlement execution
    created_trades = trigger_settlement_for_matches(round_id, matches, db=db)

    # Compute weighted average clearing price
    total_volume = sum(float(t['quantity_kg']) for t in created_trades)
    weighted_price = sum(float(t['clearing_price_per_kg']) * float(t['quantity_kg']) for t in created_trades) / total_volume if total_volume > 0 else 0.0
    weighted_price = round(weighted_price, 2)

    trade_ids = [t['_id'] for t in created_trades]
    AuctionRound.complete(round_id, weighted_price, trade_ids)

    round_doc['status'] = 'completed'
    round_doc['clearing_price_per_kg'] = weighted_price
    round_doc['matched_trade_ids'] = trade_ids

    logger.info(
        "Auction round %s for %s completed: %s trade(s), volume: %s kg, clearing price: ₹%s/kg",
        round_id, crop_name, len(created_trades), total_volume, weighted_price
    )

    return round_doc, created_trades


def run_batch_auction(crop=None, pool_first=True, db=None):
    """
    Coordinates an auction batch run.
    1. Optionally triggers pooling first so newly eligible asks are pooled.
    2. Runs auction rounds for the requested crop or all active crops.
    """
    if db is None:
        db = extensions.db

    # 1. Cross-farmer pooling run
    if pool_first:
        try:
            pool_open_listings(db=db)
        except Exception as exc:
            logger.warning("Auto-pooling prior to auction encountered an error: %s", exc)

    # 2. Determine target crops
    target_crops = []
    if crop:
        target_crops = [crop.strip()]
    else:
        # Collect distinct crops with open batches or open bids
        batch_crops = db.pooled_batches.distinct('crop', {'status': {'$in': ['open', 'partially_matched']}})
        bid_crops = db.bids.distinct('crop', {'status': {'$in': ['open', 'partially_matched']}})
        target_crops = list(dict.fromkeys([c.strip().title() for c in (batch_crops + bid_crops) if c]))

    results = []
    for c in target_crops:
        try:
            round_doc, trades = run_auction_round_for_crop(c, db=db)
            results.append({
                'crop': c,
                'round': round_doc,
                'trades': trades,
            })
        except Exception as exc:
            logger.error("Error executing auction round for crop '%s': %s", c, exc, exc_info=True)

    return results


def schedule_jobs(scheduler=None, app=None):
    """
    Registers the auction engine cron job with APScheduler.
    Uses max_instances=1 to avoid concurrency overlaps (Edge Case 16).
    """
    if scheduler is None:
        scheduler = extensions.scheduler

    # Get interval from app config if available
    interval_minutes = 15
    if app:
        interval_minutes = int(app.config.get('AUCTION_BATCH_INTERVAL_MINUTES', 15))

    def _scheduled_job():
        try:
            logger.info("Executing scheduled batch auction round...")
            if app:
                with app.app_context():
                    run_batch_auction(crop=None, pool_first=True)
            else:
                run_batch_auction(crop=None, pool_first=True)
        except Exception as exc:
            logger.error("Scheduled auction round error: %s", exc, exc_info=True)

    try:
        scheduler.add_job(
            _scheduled_job,
            trigger='interval',
            minutes=interval_minutes,
            id='krishisetu_double_auction',
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        logger.info("Auction batch scheduler initialized with %s-minute interval (max_instances=1)", interval_minutes)
    except Exception as exc:
        logger.warning("Could not add auction job to scheduler: %s", exc)
