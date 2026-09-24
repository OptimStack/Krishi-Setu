"""Unit & integration tests for Milestone 6: Double Auction Engine."""
import os
import sys
import json
from datetime import datetime, timezone
import pytest
from bson import ObjectId

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ['TESTING'] = 'True'
os.environ['MONGODB_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu_test')
os.environ['MONGODB_DB_NAME'] = 'krishisetu_test'
os.environ['JWT_SECRET_KEY'] = 'test-auction-secret-key-32chars-minimum-length-safe'

from flask_jwt_extended import create_access_token
from app import create_app, extensions
from app.auction_engine.matcher import (
    is_grade_compatible,
    match_auction_orderbook,
)
from app.auction_engine.settlement_trigger import (
    calculate_pro_rata_shares,
    execute_match_trade,
)
from app.auction_engine.batch_scheduler import (
    run_auction_round_for_crop,
    run_batch_auction,
)


@pytest.fixture(scope='module', autouse=True)
def app():
    application = create_app()
    yield application

    if extensions.db is not None:
        try:
            extensions.db.users.delete_many({})
            extensions.db.produce_listings.delete_many({})
            extensions.db.pooled_batches.delete_many({})
            extensions.db.bids.delete_many({})
            extensions.db.auction_rounds.delete_many({})
            extensions.db.trades.delete_many({})
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db():
    if extensions.db is not None:
        extensions.db.produce_listings.delete_many({})
        extensions.db.pooled_batches.delete_many({})
        extensions.db.bids.delete_many({})
        extensions.db.auction_rounds.delete_many({})
        extensions.db.trades.delete_many({})


class TestMatcherPureAlgorithm:
    def test_grade_compatibility(self):
        assert is_grade_compatible('A', 'A') is True
        assert is_grade_compatible('A', 'B') is True
        assert is_grade_compatible('A', 'C') is True
        assert is_grade_compatible('B', 'A') is False
        assert is_grade_compatible('B', 'B') is True
        assert is_grade_compatible('C', 'B') is False
        assert is_grade_compatible('C', 'C') is True

    def test_single_clearing_match(self):
        asks = [{
            'id': 'ask-1',
            'ask_price_per_kg': 20.0,
            'quantity_remaining_kg': 1000.0,
            'quality_grade': 'A',
            'created_at': '2026-09-24T10:00:00Z',
        }]
        bids = [{
            'id': 'bid-1',
            'max_price_per_kg': 30.0,
            'quantity_remaining_kg': 1000.0,
            'min_quality_grade': 'A',
            'buyer_id': 'buyer-1',
            'created_at': '2026-09-24T10:05:00Z',
        }]

        matches = match_auction_orderbook(asks, bids)
        assert len(matches) == 1
        m = matches[0]
        # Midpoint clearing price: (20 + 30) / 2 = 25
        assert m['clearing_price_per_kg'] == 25.0
        assert m['quantity_kg'] == 1000.0
        assert m['total_amount'] == 25000.0

    def test_price_time_priority_matching(self):
        # 2 Asks: Ask1 at 22, Ask2 at 20 (Ask2 should match first)
        asks = [
            {'id': 'ask-1', 'ask_price_per_kg': 22.0, 'quantity_remaining_kg': 500.0, 'quality_grade': 'B', 'created_at': '2026-09-24T10:00:00Z'},
            {'id': 'ask-2', 'ask_price_per_kg': 20.0, 'quantity_remaining_kg': 500.0, 'quality_grade': 'B', 'created_at': '2026-09-24T10:01:00Z'},
        ]
        # 1 Bid for 800 at 25
        bids = [
            {'id': 'bid-1', 'max_price_per_kg': 25.0, 'quantity_remaining_kg': 800.0, 'min_quality_grade': 'B', 'buyer_id': 'b1', 'created_at': '2026-09-24T10:05:00Z'},
        ]

        matches = match_auction_orderbook(asks, bids)
        assert len(matches) == 2
        # First match should be with ask-2 (lowest price 20)
        assert matches[0]['ask_price_per_kg'] == 20.0
        assert matches[0]['quantity_kg'] == 500.0
        assert matches[0]['clearing_price_per_kg'] == 22.5  # (20 + 25) / 2

        # Second match should take remaining 300 from ask-1 (price 22)
        assert matches[1]['ask_price_per_kg'] == 22.0
        assert matches[1]['quantity_kg'] == 300.0
        assert matches[1]['clearing_price_per_kg'] == 23.5  # (22 + 25) / 2

    def test_no_match_when_prices_do_not_cross(self):
        # Buyer wants to pay max 20, but seller asks 25
        asks = [{'id': 'a1', 'ask_price_per_kg': 25.0, 'quantity_remaining_kg': 500.0, 'quality_grade': 'A', 'created_at': '2026-09-24T10:00:00Z'}]
        bids = [{'id': 'b1', 'max_price_per_kg': 20.0, 'quantity_remaining_kg': 500.0, 'min_quality_grade': 'A', 'buyer_id': 'b1', 'created_at': '2026-09-24T10:05:00Z'}]

        matches = match_auction_orderbook(asks, bids)
        assert len(matches) == 0

    def test_grade_incompatibility_blocks_match(self):
        # Seller has Grade C, Buyer strictly requires Grade A
        asks = [{'id': 'a1', 'ask_price_per_kg': 20.0, 'quantity_remaining_kg': 500.0, 'quality_grade': 'C', 'created_at': '2026-09-24T10:00:00Z'}]
        bids = [{'id': 'b1', 'max_price_per_kg': 30.0, 'quantity_remaining_kg': 500.0, 'min_quality_grade': 'A', 'buyer_id': 'b1', 'created_at': '2026-09-24T10:05:00Z'}]

        matches = match_auction_orderbook(asks, bids)
        assert len(matches) == 0


class TestProRataFarmerShares:
    def test_exact_pro_rata_calculation(self):
        f1, f2, f3 = ObjectId(), ObjectId(), ObjectId()
        listings = [
            {'_id': ObjectId(), 'farmer_id': f1, 'quantity_remaining_kg': 500.0},
            {'_id': ObjectId(), 'farmer_id': f2, 'quantity_remaining_kg': 300.0},
            {'_id': ObjectId(), 'farmer_id': f3, 'quantity_remaining_kg': 200.0},
        ]
        # Trade matches 600 kg at 30 Rs/kg (Total = 18,000 Rs)
        shares = calculate_pro_rata_shares(listings, 600.0, 30.0)

        assert len(shares) == 3
        # 500/1000 * 600 = 300 kg -> 9000 Rs
        assert shares[0]['quantity_kg'] == 300.0
        assert shares[0]['payout_amount'] == 9000.0
        # 300/1000 * 600 = 180 kg -> 5400 Rs
        assert shares[1]['quantity_kg'] == 180.0
        assert shares[1]['payout_amount'] == 5400.0
        # 200/1000 * 600 = 120 kg -> 3600 Rs
        assert shares[2]['quantity_kg'] == 120.0
        assert shares[2]['payout_amount'] == 3600.0

        # Exact total sum verification
        total_payout = sum(s['payout_amount'] for s in shares)
        total_qty = sum(s['quantity_kg'] for s in shares)
        assert total_qty == 600.0
        assert total_payout == 18000.0


class TestDoubleAuctionSmoke:
    def test_milestone_6_smoke_test_full_round(self):
        """
        Masterplan Milestone 6 Smoke Test:
        Trigger a round against seeded data; confirm correct trades doc with pro-rata shares.
        """
        now = datetime.now(timezone.utc).isoformat()
        f1_id = ObjectId()
        f2_id = ObjectId()
        buyer_id = ObjectId()

        # 1. Seed two farmer produce listings
        l1_id = ObjectId()
        l2_id = ObjectId()
        extensions.db.produce_listings.insert_many([
            {
                '_id': l1_id,
                'farmer_id': f1_id,
                'crop': 'Wheat',
                'quality_grade': 'A',
                'quantity_kg': 400.0,
                'quantity_remaining_kg': 400.0,
                'ask_price_per_kg': 24.0,
                'status': 'pooled',
                'created_at': now,
            },
            {
                '_id': l2_id,
                'farmer_id': f2_id,
                'crop': 'Wheat',
                'quality_grade': 'A',
                'quantity_kg': 200.0,
                'quantity_remaining_kg': 200.0,
                'ask_price_per_kg': 22.0,
                'status': 'pooled',
                'created_at': now,
            },
        ])

        # 2. Seed a pooled batch grouping both listings
        batch_id = ObjectId()
        extensions.db.pooled_batches.insert_one({
            '_id': batch_id,
            'crop': 'Wheat',
            'quality_grade': 'A',
            'total_quantity_kg': 600.0,
            'quantity_remaining_kg': 600.0,
            'listing_ids': [l1_id, l2_id],
            'region': 'Nashik, Maharashtra',
            'status': 'open',
            'created_at': now,
        })
        extensions.db.produce_listings.update_many(
            {'_id': {'$in': [l1_id, l2_id]}},
            {'$set': {'pooled_batch_id': batch_id}}
        )

        # 3. Seed a buyer bid (600 kg at max price 28.0 Rs/kg)
        bid_id = ObjectId()
        extensions.db.bids.insert_one({
            '_id': bid_id,
            'buyer_id': buyer_id,
            'crop': 'Wheat',
            'quantity_needed_kg': 600.0,
            'quantity_remaining_kg': 600.0,
            'max_price_per_kg': 28.0,
            'min_quality_grade': 'A',
            'status': 'open',
            'created_at': now,
        })

        # 4. Trigger auction round for Wheat
        # Batch effective ask price = max(24.0, 22.0) = 24.0
        # Bid max price = 28.0
        # Expected clearing price = (24 + 28) / 2 = 26.0 Rs/kg
        round_doc, trades = run_auction_round_for_crop('Wheat')

        # Assertions on AuctionRound
        assert round_doc['status'] == 'completed'
        assert round_doc['clearing_price_per_kg'] == 26.0
        assert len(trades) == 1

        # Assertions on Trade document
        trade = trades[0]
        assert trade['crop'] == 'Wheat'
        assert trade['buyer_id'] == buyer_id
        assert trade['pooled_batch_id'] == batch_id
        assert trade['quantity_kg'] == 600.0
        assert trade['clearing_price_per_kg'] == 26.0
        assert trade['total_amount'] == 15600.0
        assert trade['status'] == 'pending_payment'

        # Assertions on pro-rata farmer shares
        shares = trade['farmer_shares']
        assert len(shares) == 2
        # Farmer 1 contributed 400/600 -> 400 kg * 26 = 10,400 Rs
        s1 = next(s for s in shares if str(s['farmer_id']) == str(f1_id))
        assert s1['quantity_kg'] == 400.0
        assert s1['payout_amount'] == 10400.0

        # Farmer 2 contributed 200/600 -> 200 kg * 26 = 5,200 Rs
        s2 = next(s for s in shares if str(s['farmer_id']) == str(f2_id))
        assert s2['quantity_kg'] == 200.0
        assert s2['payout_amount'] == 5200.0

        # Assertions on post-auction status updates
        updated_bid = extensions.db.bids.find_one({'_id': bid_id})
        assert updated_bid['status'] == 'matched'
        assert updated_bid['quantity_remaining_kg'] == 0.0

        updated_batch = extensions.db.pooled_batches.find_one({'_id': batch_id})
        assert updated_batch['status'] == 'matched'
        assert updated_batch['quantity_remaining_kg'] == 0.0


class TestEdgeCasesAndPartialFills:
    def test_edge_case_1_no_match_leaves_orders_open(self):
        """Edge Case 1: No match in window -> round marks no_match, orders carry forward."""
        now = datetime.now(timezone.utc).isoformat()
        bid_id = ObjectId()
        batch_id = ObjectId()

        l_id = ObjectId()
        # Buyer willing to pay max 20, Batch asks 30
        extensions.db.produce_listings.insert_one({
            '_id': l_id,
            'farmer_id': ObjectId(),
            'crop': 'Soybean',
            'quality_grade': 'A',
            'quantity_kg': 1000.0,
            'quantity_remaining_kg': 1000.0,
            'ask_price_per_kg': 30.0,
            'status': 'pooled',
            'created_at': now,
        })
        extensions.db.pooled_batches.insert_one({
            '_id': batch_id,
            'crop': 'Soybean',
            'quality_grade': 'A',
            'total_quantity_kg': 1000.0,
            'quantity_remaining_kg': 1000.0,
            'listing_ids': [l_id],
            'status': 'open',
            'created_at': now,
        })
        extensions.db.bids.insert_one({
            '_id': bid_id,
            'buyer_id': ObjectId(),
            'crop': 'Soybean',
            'quantity_needed_kg': 500.0,
            'quantity_remaining_kg': 500.0,
            'max_price_per_kg': 20.0,
            'min_quality_grade': 'A',
            'status': 'open',
            'created_at': now,
        })

        round_doc, trades = run_auction_round_for_crop('Soybean')
        assert round_doc['status'] == 'no_match'
        assert len(trades) == 0

        # Orders must still be open
        assert extensions.db.bids.find_one({'_id': bid_id})['status'] == 'open'
        assert extensions.db.pooled_batches.find_one({'_id': batch_id})['status'] == 'open'

    def test_edge_case_2_partial_fill_handling(self):
        """Edge Case 2: Partial fill (bid qty < batch qty)."""
        now = datetime.now(timezone.utc).isoformat()
        l_id = ObjectId()
        batch_id = ObjectId()
        bid_id = ObjectId()

        # Batch has 1000 kg at ask 20
        extensions.db.produce_listings.insert_one({
            '_id': l_id,
            'farmer_id': ObjectId(),
            'crop': 'Onion',
            'quality_grade': 'B',
            'quantity_kg': 1000.0,
            'quantity_remaining_kg': 1000.0,
            'ask_price_per_kg': 20.0,
            'status': 'pooled',
            'created_at': now,
        })
        extensions.db.pooled_batches.insert_one({
            '_id': batch_id,
            'crop': 'Onion',
            'quality_grade': 'B',
            'total_quantity_kg': 1000.0,
            'quantity_remaining_kg': 1000.0,
            'listing_ids': [l_id],
            'status': 'open',
            'created_at': now,
        })

        # Buyer bids for only 400 kg at max price 24
        extensions.db.bids.insert_one({
            '_id': bid_id,
            'buyer_id': ObjectId(),
            'crop': 'Onion',
            'quantity_needed_kg': 400.0,
            'quantity_remaining_kg': 400.0,
            'max_price_per_kg': 24.0,
            'min_quality_grade': 'B',
            'status': 'open',
            'created_at': now,
        })

        round_doc, trades = run_auction_round_for_crop('Onion')
        assert round_doc['status'] == 'completed'
        assert len(trades) == 1
        assert trades[0]['quantity_kg'] == 400.0
        assert trades[0]['clearing_price_per_kg'] == 22.0

        # Bid is fully matched
        bid = extensions.db.bids.find_one({'_id': bid_id})
        assert bid['status'] == 'matched'
        assert bid['quantity_remaining_kg'] == 0.0

        # Batch is partially matched with 600 kg remaining
        batch = extensions.db.pooled_batches.find_one({'_id': batch_id})
        assert batch['status'] == 'partially_matched'
        assert batch['quantity_remaining_kg'] == 600.0

        # Underlying listing has 600 kg remaining
        listing = extensions.db.produce_listings.find_one({'_id': l_id})
        assert listing['quantity_remaining_kg'] == 600.0


class TestAdminAuctionTriggerAPI:
    @pytest.fixture
    def admin_token(self, app):
        admin_id = ObjectId()
        extensions.db.users.insert_one({
            '_id': admin_id,
            'role': 'admin',
            'name': 'Auction Admin',
            'phone': f"94{admin_id.generation_time.microsecond:06d}01",
            'password_hash': 'dummy',
            'created_at': '2026-09-24T12:00:00Z',
        })
        with app.app_context():
            return create_access_token(
                identity=str(admin_id),
                additional_claims={'role': 'admin'}
            )

    def test_admin_trigger_auction_endpoint(self, client, admin_token):
        res = client.post(
            '/api/admin/trigger-auction',
            headers={'Authorization': f'Bearer {admin_token}'},
            json={'pool_first': False},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        assert 'round_count' in data['data']

    def test_admin_get_auctions_history(self, client, admin_token):
        res = client.get(
            '/api/admin/auctions',
            headers={'Authorization': f'Bearer {admin_token}'},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        assert isinstance(data['data'], list)
