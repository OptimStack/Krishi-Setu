"""Unit & integration tests for Milestone 5: Cross-Farmer Pooling Engine."""
import os
import sys
import json
from datetime import datetime, timezone, timedelta
import pytest
from bson import ObjectId

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ['TESTING'] = 'True'
os.environ['MONGODB_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu_test')
os.environ['MONGODB_DB_NAME'] = 'krishisetu_test'
os.environ['JWT_SECRET_KEY'] = 'test-pooling-secret-key-32chars-minimum-length-safe'

from flask_jwt_extended import create_access_token
from app import create_app, extensions
from app.auction_engine.pooling import (
    haversine_distance_km,
    extract_location_info,
    is_nearby,
    group_listings_by_proximity,
    pool_open_listings,
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
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db():
    """Clean produce_listings and pooled_batches before each test."""
    if extensions.db is not None:
        extensions.db.produce_listings.delete_many({})
        extensions.db.pooled_batches.delete_many({})


class TestLocationAndProximity:
    def test_haversine_distance_accurate(self):
        # Mumbai (18.9220, 72.8347) to Pune (18.5204, 73.8567) is ~120 km
        dist = haversine_distance_km((18.9220, 72.8347), (18.5204, 73.8567))
        assert 110 < dist < 130

    def test_extract_location_info_geojson(self):
        listing = {
            'location': {
                'type': 'Point',
                'coordinates': [73.7898, 19.9975],  # [lng, lat]
                'district': 'Nashik',
                'state': 'Maharashtra',
            }
        }
        coords, region = extract_location_info(listing)
        assert coords == (19.9975, 73.7898)
        assert 'Nashik' in region

    def test_is_nearby_within_threshold(self):
        # Two locations in Nashik ~5 km apart
        l1 = {'location': {'lat': 19.9975, 'lng': 73.7898, 'district': 'Nashik'}}
        l2 = {'location': {'lat': 20.0100, 'lng': 73.8100, 'district': 'Nashik'}}
        assert is_nearby(l1, l2, max_distance_km=25.0) is True

    def test_is_nearby_exceeds_threshold(self):
        # Nashik to Nagpur is ~600 km
        l1 = {'location': {'lat': 19.9975, 'lng': 73.7898, 'district': 'Nashik'}}
        l2 = {'location': {'lat': 21.1458, 'lng': 79.0882, 'district': 'Nagpur'}}
        assert is_nearby(l1, l2, max_distance_km=50.0) is False

    def test_is_nearby_district_string_fallback(self):
        l1 = {'location': {'district': 'Nashik', 'state': 'Maharashtra'}}
        l2 = {'location': {'district': 'Nashik', 'state': 'Maharashtra'}}
        assert is_nearby(l1, l2) is True


class TestCrossFarmerPoolingSmoke:
    def test_smoke_seed_3_nearby_matching_listings(self):
        """
        Masterplan Milestone 5 Smoke Test:
        Seed 3 nearby matching listings; run pooling; confirm one pooled_batches doc referencing all 3.
        """
        now = datetime.now(timezone.utc).isoformat()
        farmer1 = ObjectId()
        farmer2 = ObjectId()
        farmer3 = ObjectId()

        listings = [
            {
                '_id': ObjectId(),
                'farmer_id': farmer1,
                'crop': 'Wheat',
                'quality_grade': 'A',
                'quantity_kg': 200.0,
                'quantity_remaining_kg': 200.0,
                'ask_price_per_kg': 25.0,
                'location': {'district': 'Nashik', 'state': 'Maharashtra', 'lat': 19.99, 'lng': 73.78},
                'status': 'open',
                'created_at': now,
            },
            {
                '_id': ObjectId(),
                'farmer_id': farmer2,
                'crop': 'Wheat',
                'quality_grade': 'A',
                'quantity_kg': 200.0,
                'quantity_remaining_kg': 200.0,
                'ask_price_per_kg': 24.5,
                'location': {'district': 'Nashik', 'state': 'Maharashtra', 'lat': 20.01, 'lng': 73.80},
                'status': 'open',
                'created_at': now,
            },
            {
                '_id': ObjectId(),
                'farmer_id': farmer3,
                'crop': 'Wheat',
                'quality_grade': 'A',
                'quantity_kg': 200.0,
                'quantity_remaining_kg': 200.0,
                'ask_price_per_kg': 26.0,
                'location': {'district': 'Nashik', 'state': 'Maharashtra', 'lat': 19.98, 'lng': 73.77},
                'status': 'open',
                'created_at': now,
            },
        ]
        extensions.db.produce_listings.insert_many(listings)

        # Total = 600 kg >= 500 kg min threshold
        batches = pool_open_listings(min_quantity_kg=500.0, max_wait_minutes=60)

        # Confirm one pooled batch created referencing all 3
        assert len(batches) == 1
        batch = batches[0]
        assert batch['crop'] == 'Wheat'
        assert batch['quality_grade'] == 'A'
        assert batch['total_quantity_kg'] == 600.0
        assert len(batch['listing_ids']) == 3

        # Confirm listing IDs match
        expected_ids = {str(l['_id']) for l in listings}
        actual_ids = {str(lid) for lid in batch['listing_ids']}
        assert expected_ids == actual_ids

        # Confirm listings were updated to status: 'pooled' with pooled_batch_id
        updated_listings = list(extensions.db.produce_listings.find({'_id': {'$in': [l['_id'] for l in listings]}}))
        assert len(updated_listings) == 3
        for l in updated_listings:
            assert l['status'] == 'pooled'
            assert str(l['pooled_batch_id']) == str(batch['_id'])


class TestPoolingRulesAndEdgeCases:
    def test_edge_case_20_different_grades_never_mixed(self):
        """Edge Case 20: Pooling only groups listings with the same quality_grade."""
        now = datetime.now(timezone.utc).isoformat()
        # 300kg Grade A + 300kg Grade B in the same region
        extensions.db.produce_listings.insert_many([
            {
                '_id': ObjectId(),
                'farmer_id': ObjectId(),
                'crop': 'Onion',
                'quality_grade': 'A',
                'quantity_kg': 300.0,
                'quantity_remaining_kg': 300.0,
                'location': {'district': 'Nashik'},
                'status': 'open',
                'created_at': now,
            },
            {
                '_id': ObjectId(),
                'farmer_id': ObjectId(),
                'crop': 'Onion',
                'quality_grade': 'B',
                'quantity_kg': 300.0,
                'quantity_remaining_kg': 300.0,
                'location': {'district': 'Nashik'},
                'status': 'open',
                'created_at': now,
            },
        ])

        # Min threshold 500 kg -> neither reaches 500 kg on its own
        batches = pool_open_listings(min_quantity_kg=500.0, max_wait_minutes=60)
        assert len(batches) == 0

    def test_different_crops_never_mixed(self):
        now = datetime.now(timezone.utc).isoformat()
        extensions.db.produce_listings.insert_many([
            {
                '_id': ObjectId(),
                'farmer_id': ObjectId(),
                'crop': 'Onion',
                'quality_grade': 'A',
                'quantity_kg': 300.0,
                'quantity_remaining_kg': 300.0,
                'location': {'district': 'Nashik'},
                'status': 'open',
                'created_at': now,
            },
            {
                '_id': ObjectId(),
                'farmer_id': ObjectId(),
                'crop': 'Soybean',
                'quality_grade': 'A',
                'quantity_kg': 300.0,
                'quantity_remaining_kg': 300.0,
                'location': {'district': 'Nashik'},
                'status': 'open',
                'created_at': now,
            },
        ])
        batches = pool_open_listings(min_quantity_kg=500.0, max_wait_minutes=60)
        assert len(batches) == 0

    def test_distant_listings_form_separate_clusters(self):
        now = datetime.now(timezone.utc).isoformat()
        # 600kg in Nashik + 600kg in Nagpur (>500km away)
        extensions.db.produce_listings.insert_many([
            {
                '_id': ObjectId(),
                'farmer_id': ObjectId(),
                'crop': 'Soybean',
                'quality_grade': 'A',
                'quantity_kg': 600.0,
                'quantity_remaining_kg': 600.0,
                'location': {'lat': 19.9975, 'lng': 73.7898, 'district': 'Nashik'},
                'status': 'open',
                'created_at': now,
            },
            {
                '_id': ObjectId(),
                'farmer_id': ObjectId(),
                'crop': 'Soybean',
                'quality_grade': 'A',
                'quantity_kg': 600.0,
                'quantity_remaining_kg': 600.0,
                'location': {'lat': 21.1458, 'lng': 79.0882, 'district': 'Nagpur'},
                'status': 'open',
                'created_at': now,
            },
        ])
        batches = pool_open_listings(min_quantity_kg=500.0, max_wait_minutes=60, max_distance_km=50.0)
        # Should create 2 separate batches
        assert len(batches) == 2
        regions = {b['region'] for b in batches}
        assert any('Nashik' in r for r in regions)
        assert any('Nagpur' in r for r in regions)

    def test_edge_case_19_timeout_triggers_pooling_below_volume(self):
        """Edge Case 19: Pooled batch sits open too long -> max-wait timeout triggers pooling."""
        # Created 90 minutes ago, only 200 kg (< 500 kg threshold)
        past_time = (datetime.now(timezone.utc) - timedelta(minutes=90)).isoformat()
        lid = ObjectId()
        extensions.db.produce_listings.insert_one({
            '_id': lid,
            'farmer_id': ObjectId(),
            'crop': 'Tomato',
            'quality_grade': 'B',
            'quantity_kg': 200.0,
            'quantity_remaining_kg': 200.0,
            'location': {'district': 'Pune'},
            'status': 'open',
            'created_at': past_time,
        })

        batches = pool_open_listings(min_quantity_kg=500.0, max_wait_minutes=60)
        assert len(batches) == 1
        assert batches[0]['total_quantity_kg'] == 200.0
        assert batches[0]['crop'] == 'Tomato'

    def test_ungraded_produce_is_not_pooled(self):
        """Ungraded produce must not be pooled into pooled_batches until graded."""
        now = datetime.now(timezone.utc).isoformat()
        extensions.db.produce_listings.insert_one({
            '_id': ObjectId(),
            'farmer_id': ObjectId(),
            'crop': 'Wheat',
            'quality_grade': 'ungraded',
            'quantity_kg': 1000.0,
            'quantity_remaining_kg': 1000.0,
            'location': {'district': 'Pune'},
            'status': 'open',
            'created_at': now,
        })
        batches = pool_open_listings(min_quantity_kg=500.0, max_wait_minutes=60)
        assert len(batches) == 0

    def test_dry_run_does_not_modify_db(self):
        now = datetime.now(timezone.utc).isoformat()
        lid = ObjectId()
        extensions.db.produce_listings.insert_one({
            '_id': lid,
            'farmer_id': ObjectId(),
            'crop': 'Wheat',
            'quality_grade': 'A',
            'quantity_kg': 600.0,
            'quantity_remaining_kg': 600.0,
            'location': {'district': 'Nashik'},
            'status': 'open',
            'created_at': now,
        })

        batches = pool_open_listings(min_quantity_kg=500.0, max_wait_minutes=60, dry_run=True)
        assert len(batches) == 1
        assert batches[0]['simulated'] is True

        # Database state remains 'open'
        listing = extensions.db.produce_listings.find_one({'_id': lid})
        assert listing['status'] == 'open'
        assert extensions.db.pooled_batches.count_documents({}) == 0


class TestAdminTriggerPoolingEndpoint:
    @pytest.fixture
    def admin_token(self, app):
        admin_id = ObjectId()
        doc = {
            '_id': admin_id,
            'role': 'admin',
            'name': 'Admin User',
            'phone': f"95{admin_id.generation_time.microsecond:06d}01",
            'password_hash': 'dummy_hash',
            'created_at': '2026-09-24T12:00:00Z',
        }
        extensions.db.users.insert_one(doc)
        with app.app_context():
            return create_access_token(
                identity=str(admin_id),
                additional_claims={'role': 'admin'}
            )

    def test_trigger_pooling_api(self, client, admin_token):
        now = datetime.now(timezone.utc).isoformat()
        extensions.db.produce_listings.insert_one({
            '_id': ObjectId(),
            'farmer_id': ObjectId(),
            'crop': 'Onion',
            'quality_grade': 'A',
            'quantity_kg': 800.0,
            'quantity_remaining_kg': 800.0,
            'location': {'district': 'Nashik'},
            'status': 'open',
            'created_at': now,
        })

        res = client.post(
            '/api/admin/trigger-pooling',
            headers={'Authorization': f'Bearer {admin_token}'},
            json={'min_quantity_kg': 500.0},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data['data']['created_count'] == 1
        assert len(data['data']['batches']) == 1

    def test_pooling_preview_api(self, client, admin_token):
        now = datetime.now(timezone.utc).isoformat()
        extensions.db.produce_listings.insert_one({
            '_id': ObjectId(),
            'farmer_id': ObjectId(),
            'crop': 'Gram',
            'quality_grade': 'B',
            'quantity_kg': 700.0,
            'quantity_remaining_kg': 700.0,
            'location': {'district': 'Solapur'},
            'status': 'open',
            'created_at': now,
        })

        res = client.get(
            '/api/admin/pooling-preview?min_quantity_kg=500',
            headers={'Authorization': f'Bearer {admin_token}'},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data['data']['preview_count'] == 1
        # No actual pooled batch committed
        assert extensions.db.pooled_batches.count_documents({}) == 0
