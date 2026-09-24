import logging
from datetime import datetime, timezone
from bson import ObjectId
from app.models.produce_listing import ProduceListing
from app.models.pooled_batch import PooledBatch
from app.models.trade import Trade
from app.models.bid import Bid

logger = logging.getLogger(__name__)


def calculate_payout_splits(total_amount: float, contributors: list) -> list:
    """
    Calculates exact pro-rata monetary splits across contributing farmers in a batch trade.
    """
    total_qty = sum(float(c.get("quantity_kg", c.get("quantity", 0))) for c in contributors)
    if total_qty <= 0:
        return []

    splits = []
    running_sum = 0.0

    for i, c in enumerate(contributors):
        qty = float(c.get("quantity_kg", c.get("quantity", 0)))
        if i == len(contributors) - 1:
            # Rounding reconciliation: allocate remaining cents to last contributor
            payout = round(total_amount - running_sum, 2)
        else:
            payout = round((qty / total_qty) * total_amount, 2)
            running_sum += payout

        splits.append({
            "farmer_id": str(c.get("farmer_id")),
            "quantity_kg": qty,
            "payout_amount": payout,
            "share_percentage": round((qty / total_qty) * 100, 2),
        })

    return splits


def settle_trade_and_distribute_payouts(trade_id: str) -> dict:
    """
    Finalizes a trade upon verified payment:
    1. Sets Trade.status = 'settled', settled_at = now
    2. Marks all contributing ProduceListings as 'settled'
    3. Closes the PooledBatch
    """
    trade = Trade.find_by_id(trade_id)
    if not trade:
        raise ValueError(f"Trade {trade_id} not found")

    now = datetime.now(timezone.utc).isoformat()
    updated_trade = Trade.settle(trade_id)

    # 1. Update contributing produce listings to 'settled'
    for share in trade.get("farmer_shares", []):
        listing_id = share.get("listing_id")
        if listing_id:
            try:
                ProduceListing.update_status(listing_id, "settled")
            except Exception as e:
                logger.warning("Could not mark listing %s as settled: %s", listing_id, e)

    # 2. Update pooled batch to 'closed'
    batch_id = trade.get("pooled_batch_id")
    if batch_id:
        try:
            PooledBatch.update_status(batch_id, "closed")
        except Exception as e:
            logger.warning("Could not mark pooled batch %s as closed: %s", batch_id, e)

    logger.info("Successfully settled trade %s and updated all dependent lots", trade_id)
    return {
        "trade": updated_trade,
        "settled_at": now,
        "farmer_shares": trade.get("farmer_shares", [])
    }


def handle_failed_payment_reopen(trade_id: str) -> dict:
    """
    Section 9 Edge Case 9:
    Payment fails after auction match already committed: trades.status -> failed;
    the pooled batch/bid reopen for the next round instead of being treated as sold-and-lost.
    """
    trade = Trade.find_by_id(trade_id)
    if not trade:
        raise ValueError(f"Trade {trade_id} not found")

    Trade.update(trade_id, {"status": "failed"})

    # Reopen contributing produce listings
    for share in trade.get("farmer_shares", []):
        listing_id = share.get("listing_id")
        if listing_id:
            try:
                ProduceListing.update_status(listing_id, "open")
            except Exception as e:
                logger.warning("Could not reopen listing %s: %s", listing_id, e)

    # Reopen pooled batch
    batch_id = trade.get("pooled_batch_id")
    if batch_id:
        try:
            PooledBatch.update_status(batch_id, "open")
        except Exception as e:
            logger.warning("Could not reopen batch %s: %s", batch_id, e)

    logger.info("Reopened batch and listings for failed trade %s", trade_id)
    return {"trade_id": trade_id, "status": "failed", "reopened": True}
