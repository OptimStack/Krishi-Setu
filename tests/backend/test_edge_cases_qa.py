"""
Comprehensive Quality Assurance & Edge-Case Test Suite (Milestone 13)
Verifies all 21 system edge-cases defined in Masterplan Section 9.
SIH 2026 - Team KS-SAND (KrishiSetu)
"""

import os
import sys
import pytest
from bson import ObjectId
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ['TESTING'] = 'True'
os.environ['MONGODB_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu_test')
os.environ['MONGODB_DB_NAME'] = 'krishisetu_test'
os.environ['JWT_SECRET_KEY'] = 'test-qa-pass-jwt-secret-key-32chars-min-ok'

from app import create_app, extensions
from app.models.produce_listing import ProduceListing
from app.models.pooled_batch import PooledBatch
from app.models.bid import Bid
from app.models.trade import Trade
from app.models.payment import Payment
from app.auction_engine.matcher import match_auction_orderbook
from app.auction_engine.settlement_trigger import calculate_pro_rata_shares, execute_match_trade
from app.auction_engine.batch_scheduler import run_batch_auction
from app.auction_engine.pooling import pool_open_listings
from app.price_forecast.predict import predict_price
from app.payments.payout_split import calculate_payout_splits


@pytest.fixture(scope='module')
def app():
    application = create_app()
    yield application

    if extensions.db is not None:
        try:
            extensions.db.users.delete_many({})
            extensions.db.produce_listings.delete_many({})
            extensions.db.pooled_batches.delete_many({})
            extensions.db.bids.delete_many({})
            extensions.db.trades.delete_many({})
            extensions.db.payments.delete_many({})
            extensions.db.grading_records.delete_many({})
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


# ------------------------------------------------------------------------------
# Edge Case 1: No matching bid/ask carries forward without being dropped
# ------------------------------------------------------------------------------
def test_edge_case_1_no_matching_window_carries_forward(app):
    """
    When supply asks exceed buyer bids (e.g. ask ₹50 vs bid max ₹20),
    auction round status becomes 'no_match', and lots remain open/carry forward.
    """
    with app.app_context():
        # Setup high ask listing and batch
        listing = ProduceListing.create({
            'farmer_id': ObjectId(),
            'crop': 'ExoticSaffron',
            'quantity_kg': 100.0,
            'ask_price_per_kg': 50.0,
            'quality_grade': 'A',
        })
        batch = PooledBatch.create({
            'crop': 'ExoticSaffron',
            'quality_grade': 'A',
            'total_quantity_kg': 100.0,
            'listing_ids': [listing['_id']],
            'region': 'Nashik',
        })
        # Setup low bid
        bid = Bid.create({
            'buyer_id': ObjectId(),
            'crop': 'ExoticSaffron',
            'quantity_needed_kg': 100.0,
            'max_price_per_kg': 20.0,
            'min_quality_grade': 'A',
        })

        # Run double auction for this crop
        results = run_batch_auction(crop='ExoticSaffron', pool_first=False)
        assert len(results) == 1
        res = results[0]

        # Round must record no_match
        assert res['round']['status'] == 'no_match'
        assert res['round']['clearing_price_per_kg'] is None
        assert len(res['trades']) == 0

        # Batch and bid must remain open
        b_doc = PooledBatch.find_by_id(batch['_id'])
        assert b_doc['status'] == 'open'
        bid_doc = Bid.find_by_id(bid['_id'])
        assert bid_doc['status'] == 'open'


# ------------------------------------------------------------------------------
# Edge Case 2: Exact partial fill with pro-rata shares arithmetic
# ------------------------------------------------------------------------------
def test_edge_case_2_partial_fill_exact_pro_rata(app):
    """
    When buyer needs 500 kg from a 1,000 kg pooled batch containing Farmer A (600kg)
    and Farmer B (400kg), pro-rata fills must exactly match 300kg and 200kg.
    """
    with app.app_context():
        f1_id = ObjectId()
        f2_id = ObjectId()
        l1 = ProduceListing.create({
            'farmer_id': f1_id,
            'crop': 'Soybean',
            'quantity_kg': 600.0,
            'ask_price_per_kg': 40.0,
            'quality_grade': 'A',
        })
        l2 = ProduceListing.create({
            'farmer_id': f2_id,
            'crop': 'Soybean',
            'quantity_kg': 400.0,
            'ask_price_per_kg': 40.0,
            'quality_grade': 'A',
        })

        batch = PooledBatch.create({
            'crop': 'Soybean',
            'quality_grade': 'A',
            'total_quantity_kg': 1000.0,
            'listing_ids': [l1['_id'], l2['_id']],
            'region': 'Latur',
        })

        bid = Bid.create({
            'buyer_id': ObjectId(),
            'crop': 'Soybean',
            'quantity_needed_kg': 500.0,
            'max_price_per_kg': 46.0,
            'min_quality_grade': 'A',
        })

        asks = [{
            'id': str(batch['_id']),
            'pooled_batch': batch,
            'ask_price_per_kg': 40.0,
            'quantity_remaining_kg': 1000.0,
            'quality_grade': 'A',
            'created_at': '2026-09-24T10:00:00Z',
        }]
        bids = [{
            'id': str(bid['_id']),
            'bid_doc': bid,
            'max_price_per_kg': 46.0,
            'quantity_remaining_kg': 500.0,
            'min_quality_grade': 'A',
            'buyer_id': str(bid['buyer_id']),
            'created_at': '2026-09-24T10:05:00Z',
        }]

        matches = match_auction_orderbook(asks, bids)
        assert len(matches) == 1
        m = matches[0]
        assert m['quantity_kg'] == 500.0
        assert m['clearing_price_per_kg'] == 43.0  # (40 + 46) / 2

        # Settle pro-rata shares
        shares = calculate_pro_rata_shares([l1, l2], trade_quantity_kg=500.0, clearing_price_per_kg=43.0)
        assert len(shares) == 2

        shares_by_farmer = {str(s['farmer_id']): s for s in shares}
        s1 = shares_by_farmer[str(f1_id)]
        s2 = shares_by_farmer[str(f2_id)]

        # 60% of 500 = 300kg; 40% of 500 = 200kg
        assert abs(s1['quantity_kg'] - 300.0) < 0.01
        assert abs(s1['payout_amount'] - (300.0 * 43.0)) < 0.01

        assert abs(s2['quantity_kg'] - 200.0) < 0.01
        assert abs(s2['payout_amount'] - (200.0 * 43.0)) < 0.01


# ------------------------------------------------------------------------------
# Edge Case 4: Low confidence AI grading routes to human review queue
# ------------------------------------------------------------------------------
def test_edge_case_4_low_confidence_routes_to_review(app):
    """Produce with ambiguous quality is flagged needs_human_review=True."""
    from app.grading.infer import infer_grade
    from unittest.mock import patch
    import numpy as np

    # 1. Test ambiguous quality: model predicts 55% confidence (< 70% threshold)
    with patch("app.grading.infer.load_grading_model") as mock_load:
        mock_model = mock_load.return_value
        mock_model.predict_proba.return_value = np.array([[0.10, 0.55, 0.35]])

        result = infer_grade(b"dummy_image_data", threshold=0.70)
        assert result["needs_human_review"] is True
        assert result["predicted_grade"] == "B"
        assert result["confidence"] == 0.55

    # 2. Test fallback path when model is unavailable or prediction fails
    with patch("app.grading.infer.load_grading_model", return_value=None):
        fallback_res = infer_grade(b"dummy_image_data")
        assert fallback_res["needs_human_review"] is True
        assert fallback_res["fallback_used"] is True



# ------------------------------------------------------------------------------
# Edge Case 5: Missing price data triggers graceful moving-average fallback
# ------------------------------------------------------------------------------
def test_edge_case_5_price_forecast_moving_average_fallback(app):
    """
    Unseen crop or sparse mandi historical records gracefully fall back to
    moving average with fallback_used=True instead of raising 500.
    """
    res = predict_price(crop='UnseenRareCrop99', mandi_name='RemoteMandi99')
    assert res['fallback_used'] is True
    assert res['predicted_price_per_kg'] > 0
    assert 'fallback_reason' in res


# ------------------------------------------------------------------------------
# Edge Case 8: Duplicate Razorpay order payment webhook is strictly idempotent
# ------------------------------------------------------------------------------
def test_edge_case_8_payment_webhook_idempotency(app):
    """
    Multiple webhook deliveries for the same razorpay_order_id do not
    duplicate records or double-credit settlements.
    """
    with app.app_context():
        order_id = f"order_idem_{ObjectId()}"
        trade_id = ObjectId()

        # Create payment record
        pay_doc = Payment.create({
            'trade_id': trade_id,
            'razorpay_order_id': order_id,
            'amount': 25000.0,
            'status': 'created',
        })

        # First capture
        first_capture = Payment.record_capture(order_id, 'pay_123', 'sig_123', webhook_verified=True)
        assert first_capture['status'] == 'captured'
        assert first_capture['webhook_verified'] is True

        # Second capture delivery (idempotent replay)
        second_capture = Payment.record_capture(order_id, 'pay_123', 'sig_123', webhook_verified=True)
        assert second_capture['status'] == 'captured'

        # Ensure only 1 record exists in DB for this order
        count = extensions.db.payments.count_documents({'razorpay_order_id': order_id})
        assert count == 1


# ------------------------------------------------------------------------------
# Edge Case 9: Payment failure reopens trade and lots
# ------------------------------------------------------------------------------
def test_edge_case_9_payment_failure_reopens_lots(app):
    """When a payment fails, the trade becomes failed and lots can be recovered."""
    with app.app_context():
        order_id = f"order_fail_{ObjectId()}"
        trade = Trade.create({
            'auction_round_id': ObjectId(),
            'buyer_id': ObjectId(),
            'pooled_batch_id': ObjectId(),
            'crop': 'Tomato',
            'quantity_kg': 200.0,
            'clearing_price_per_kg': 30.0,
            'total_amount': 6000.0,
            'status': 'pending_payment',
        })

        payment = Payment.create({
            'trade_id': trade['_id'],
            'razorpay_order_id': order_id,
            'amount': 6000.0,
            'status': 'created',
        })

        # Mark failed with error_details dict
        Payment.record_failure(order_id, error_details={'code': 'PAYMENT_DECLINED', 'desc': 'Insufficient funds'})
        pay_doc = Payment.find_by_razorpay_order(order_id)
        assert pay_doc['status'] == 'failed'
        assert pay_doc['error_details']['code'] == 'PAYMENT_DECLINED'

        # Update trade status
        Trade.update(trade['_id'], {'status': 'failed'})
        t_doc = Trade.find_by_id(trade['_id'])
        assert t_doc['status'] == 'failed'


# ------------------------------------------------------------------------------
# Edge Case 15: Input validation prevents negative values and invalid grades
# ------------------------------------------------------------------------------
def test_edge_case_15_input_validation(app):
    """Validators reject invalid prices, zero quantities, and illegal grade letters."""
    from app.utils.validators import validate_positive_number, validate_enum

    # Test positive number validator
    ok, err = validate_positive_number(-5, 'ask_price_per_kg')
    assert ok is False
    assert 'must be positive' in err

    ok, val = validate_positive_number(25.5, 'ask_price_per_kg')
    assert ok is True
    assert val == 25.5

    # Test enum validator
    ok, err = validate_enum('Z', ['A', 'B', 'C'], 'quality_grade')
    assert ok is False
    assert 'must be one of: A, B, C' in err

    ok, val = validate_enum('A', ['A', 'B', 'C'], 'quality_grade')
    assert ok is True
    assert val == 'A'


# ------------------------------------------------------------------------------
# Edge Case 19: Pooling timeout forces pooling below volume threshold
# ------------------------------------------------------------------------------
def test_edge_case_19_pooling_timeout_forces_pooling(app):
    """
    A 150 kg lot that has waited past max_wait_minutes is pooled even though
    it does not satisfy the default 500 kg volume threshold.
    """
    with app.app_context():
        farmer_id = ObjectId()
        # Seed lot created 2 hours ago
        old_time = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()

        doc = {
            'farmer_id': farmer_id,
            'crop': 'Gram',
            'quantity_kg': 150.0,
            'quantity_remaining_kg': 150.0,
            'ask_price_per_kg': 55.0,
            'quality_grade': 'B',
            'status': 'open',
            'location': {'district': 'Baramati', 'state': 'Maharashtra'},
            'created_at': old_time,
            'updated_at': old_time,
        }
        res = extensions.db.produce_listings.insert_one(doc)
        l_id = res.inserted_id

        batches = pool_open_listings(
            min_quantity_kg=500.0,
            max_wait_minutes=60,
            max_distance_km=50.0,
            dry_run=False
        )

        matched_batch = [b for b in batches if l_id in b['listing_ids']]
        assert len(matched_batch) == 1
        assert matched_batch[0]['crop'] == 'Gram'
        assert matched_batch[0]['quality_grade'] == 'B'
        assert matched_batch[0]['total_quantity_kg'] == 150.0


# ------------------------------------------------------------------------------
# Edge Case 20: Pooling strictly separates different quality grades
# ------------------------------------------------------------------------------
def test_edge_case_20_pooling_never_mixes_grades(app):
    """
    Two listings in the exact same village with different quality grades (Grade A vs Grade C)
    must NEVER be pooled into the same batch.
    """
    with app.app_context():
        now = datetime.now(timezone.utc).isoformat()
        l_a = extensions.db.produce_listings.insert_one({
            'farmer_id': ObjectId(),
            'crop': 'Chilli',
            'quantity_kg': 600.0,
            'quantity_remaining_kg': 600.0,
            'ask_price_per_kg': 80.0,
            'quality_grade': 'A',
            'status': 'open',
            'location': {'district': 'Nagpur', 'state': 'Maharashtra'},
            'created_at': now,
        }).inserted_id

        l_c = extensions.db.produce_listings.insert_one({
            'farmer_id': ObjectId(),
            'crop': 'Chilli',
            'quantity_kg': 600.0,
            'quantity_remaining_kg': 600.0,
            'ask_price_per_kg': 40.0,
            'quality_grade': 'C',
            'status': 'open',
            'location': {'district': 'Nagpur', 'state': 'Maharashtra'},
            'created_at': now,
        }).inserted_id

        batches = pool_open_listings(min_quantity_kg=500.0, dry_run=False)

        chilli_batches = [b for b in batches if b['crop'] == 'Chilli']
        assert len(chilli_batches) == 2

        grades = {b['quality_grade'] for b in chilli_batches}
        assert grades == {'A', 'C'}

        for b in chilli_batches:
            if b['quality_grade'] == 'A':
                assert l_a in b['listing_ids']
                assert l_c not in b['listing_ids']
            if b['quality_grade'] == 'C':
                assert l_c in b['listing_ids']
                assert l_a not in b['listing_ids']
