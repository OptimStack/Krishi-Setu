import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

GRADE_RANK = {
    'A': 3,
    'B': 2,
    'C': 1,
}


def is_grade_compatible(batch_grade, bid_min_grade):
    """
    Returns True if batch_grade meets or exceeds bid_min_grade.
    e.g. Grade A batch satisfies bids with min_grade A, B, or C.
    Grade B batch satisfies bids with min_grade B or C.
    """
    b_grade = str(batch_grade or 'C').strip().upper()
    m_grade = str(bid_min_grade or 'C').strip().upper()

    b_rank = GRADE_RANK.get(b_grade, 1)
    m_rank = GRADE_RANK.get(m_grade, 1)

    return b_rank >= m_rank


def match_auction_orderbook(asks, bids):
    """
    Classic Double-Auction Matching Algorithm.

    Supply (Asks):
      Sorted ASCENDING by ask_price_per_kg (lowest asks first).
      Tie-breaker: earliest created_at (FIFO).

    Demand (Bids):
      Sorted DESCENDING by max_price_per_kg (highest bids first).
      Tie-breaker: earliest created_at (FIFO).

    Clearing:
      Supply meets demand where Bid Price >= Ask Price and quality grade is compatible.
      Clearing price is the fair midpoint: (Bid Price + Ask Price) / 2.0.
      Supports partial fills on both sides.

    Args:
      asks: list of dicts with:
        'id', 'pooled_batch', 'ask_price_per_kg', 'quantity_remaining_kg', 'quality_grade', 'created_at'
      bids: list of dicts with:
        'id', 'bid_doc', 'max_price_per_kg', 'quantity_remaining_kg', 'min_quality_grade', 'buyer_id', 'created_at'

    Returns:
      list of matched trade proposals:
      [
        {
          'pooled_batch': dict,
          'bid_doc': dict,
          'ask_price_per_kg': float,
          'bid_max_price_per_kg': float,
          'clearing_price_per_kg': float,
          'quantity_kg': float,
          'total_amount': float,
        }
      ]
    """
    # Clone to avoid mutating caller dictionaries in-place
    ask_items = []
    for a in asks:
        qty = float(a.get('quantity_remaining_kg', a.get('total_quantity_kg', 0)))
        if qty > 0:
            ask_items.append({
                'id': a.get('id') or a.get('_id'),
                'pooled_batch': a.get('pooled_batch', a),
                'ask_price_per_kg': float(a.get('ask_price_per_kg', 0)),
                'quantity_remaining_kg': qty,
                'quality_grade': str(a.get('quality_grade', 'C')).upper(),
                'created_at': str(a.get('created_at', '')),
            })

    bid_items = []
    for b in bids:
        qty = float(b.get('quantity_remaining_kg', b.get('quantity_needed_kg', 0)))
        if qty > 0:
            bid_items.append({
                'id': b.get('id') or b.get('_id'),
                'bid_doc': b.get('bid_doc', b),
                'max_price_per_kg': float(b.get('max_price_per_kg', 0)),
                'quantity_remaining_kg': qty,
                'min_quality_grade': str(b.get('min_quality_grade', 'C')).upper(),
                'buyer_id': b.get('buyer_id') or b.get('bid_doc', {}).get('buyer_id'),
                'created_at': str(b.get('created_at', '')),
            })

    # Sort Asks ascending by price, then FIFO by created_at
    ask_items.sort(key=lambda x: (x['ask_price_per_kg'], x['created_at']))

    # Sort Bids descending by price, then FIFO by created_at
    bid_items.sort(key=lambda x: (-x['max_price_per_kg'], x['created_at']))

    matches = []

    # Iterate through asks and bids
    for a in ask_items:
        if a['quantity_remaining_kg'] <= 0:
            continue

        for b in bid_items:
            if b['quantity_remaining_kg'] <= 0:
                continue

            # Check if prices cross and grade is acceptable
            if b['max_price_per_kg'] >= a['ask_price_per_kg'] and is_grade_compatible(a['quality_grade'], b['min_quality_grade']):
                # Fair midpoint clearing price
                clearing_price = round((b['max_price_per_kg'] + a['ask_price_per_kg']) / 2.0, 2)

                # Matchable volume is minimum of remaining demand and supply
                trade_volume = round(min(a['quantity_remaining_kg'], b['quantity_remaining_kg']), 2)
                if trade_volume <= 0:
                    continue

                total_amount = round(trade_volume * clearing_price, 2)

                matches.append({
                    'pooled_batch': a['pooled_batch'],
                    'bid_doc': b['bid_doc'],
                    'ask_price_per_kg': a['ask_price_per_kg'],
                    'bid_max_price_per_kg': b['max_price_per_kg'],
                    'clearing_price_per_kg': clearing_price,
                    'quantity_kg': trade_volume,
                    'total_amount': total_amount,
                })

                # Deduct matched volume
                a['quantity_remaining_kg'] = round(a['quantity_remaining_kg'] - trade_volume, 2)
                b['quantity_remaining_kg'] = round(b['quantity_remaining_kg'] - trade_volume, 2)

                if a['quantity_remaining_kg'] <= 0:
                    break

    return matches
