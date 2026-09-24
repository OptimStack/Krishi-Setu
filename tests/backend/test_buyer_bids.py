"""Unit & integration tests for Milestone 4: Buyer Module (Bids & Batch Browsing)."""
import json
import os
import sys
import pytest
from bson import ObjectId

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ['TESTING'] = 'True'
os.environ['MONGODB_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu_test')
os.environ['MONGODB_DB_NAME'] = 'krishisetu_test'
os.environ['JWT_SECRET_KEY'] = 'test-buyer-secret-key-32chars-minimum-length-safe'

from flask_jwt_extended import create_access_token
from app import create_app
from app import extensions


@pytest.fixture(scope='module')
def app():
    application = create_app()
    yield application

    if extensions.db is not None:
        try:
            extensions.db.users.delete_many({})
            extensions.db.bids.delete_many({})
            extensions.db.pooled_batches.delete_many({})
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def buyer_user(app):
    """Creates a buyer user in the test database and returns user document."""
    buyer_id = ObjectId()
    doc = {
        '_id': buyer_id,
        'role': 'buyer',
        'name': 'Agro Processor Ltd',
        'phone': f"97{buyer_id.generation_time.microsecond:06d}01",
        'password_hash': 'dummy_hash',
        'location': {'city': 'Pune', 'state': 'Maharashtra'},
        'kyc_verified': True,
        'created_at': '2026-09-24T12:00:00Z',
    }
    extensions.db.users.insert_one(doc)
    return doc


@pytest.fixture
def buyer_token(app, buyer_user):
    """Generates a valid buyer access token."""
    with app.app_context():
        return create_access_token(
            identity=str(buyer_user['_id']),
            additional_claims={'role': 'buyer'}
        )


@pytest.fixture
def other_buyer_user(app):
    """Creates a second buyer user for authorization testing."""
    buyer_id = ObjectId()
    doc = {
        '_id': buyer_id,
        'role': 'buyer',
        'name': 'Other Trader LLC',
        'phone': f"97{buyer_id.generation_time.microsecond:06d}02",
        'password_hash': 'dummy_hash',
        'location': {'city': 'Mumbai', 'state': 'Maharashtra'},
        'kyc_verified': True,
        'created_at': '2026-09-24T12:00:00Z',
    }
    extensions.db.users.insert_one(doc)
    return doc


@pytest.fixture
def other_buyer_token(app, other_buyer_user):
    with app.app_context():
        return create_access_token(
            identity=str(other_buyer_user['_id']),
            additional_claims={'role': 'buyer'}
        )


@pytest.fixture
def farmer_user(app):
    """Creates a farmer user in the test database."""
    farmer_id = ObjectId()
    doc = {
        '_id': farmer_id,
        'role': 'farmer',
        'name': 'Ramesh Shinde',
        'phone': f"96{farmer_id.generation_time.microsecond:06d}03",
        'password_hash': 'dummy_hash',
        'location': {'district': 'Nashik', 'state': 'Maharashtra'},
        'kyc_verified': True,
        'created_at': '2026-09-24T12:00:00Z',
    }
    extensions.db.users.insert_one(doc)
    return doc


@pytest.fixture
def farmer_token(app, farmer_user):
    with app.app_context():
        return create_access_token(
            identity=str(farmer_user['_id']),
            additional_claims={'role': 'farmer'}
        )


class TestBuyerBidsCreate:
    def test_create_bid_success(self, client, buyer_token):
        res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={
                'crop': 'Soybean',
                'quantity_needed_kg': 5000,
                'max_price_per_kg': 44.5,
                'min_quality_grade': 'A',
            },
        )
        assert res.status_code == 201
        data = json.loads(res.data)
        assert data['error'] is None
        assert 'id' in data['data']
        bid = data['data']['bid']
        assert bid['crop'] == 'Soybean'
        assert bid['quantity_needed_kg'] == 5000.0
        assert bid['max_price_per_kg'] == 44.5
        assert bid['min_quality_grade'] == 'A'
        assert bid['status'] == 'open'

    def test_create_bid_with_aliases(self, client, buyer_token):
        res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={
                'commodity': 'Wheat',
                'quantity': 2500,
                'price': 26.0,
                'grade': 'B',
            },
        )
        assert res.status_code == 201
        data = json.loads(res.data)
        bid = data['data']['bid']
        assert bid['crop'] == 'Wheat'
        assert bid['quantity_needed_kg'] == 2500.0
        assert bid['max_price_per_kg'] == 26.0
        assert bid['min_quality_grade'] == 'B'

    def test_create_bid_default_grade_c(self, client, buyer_token):
        res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={
                'crop': 'Onion',
                'quantity_needed_kg': 1000,
                'max_price_per_kg': 22.0,
            },
        )
        assert res.status_code == 201
        data = json.loads(res.data)
        assert data['data']['bid']['min_quality_grade'] == 'C'

    def test_validation_missing_crop(self, client, buyer_token):
        res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={'quantity_needed_kg': 1000, 'max_price_per_kg': 25},
        )
        assert res.status_code == 400
        data = json.loads(res.data)
        assert data['error']['code'] == 'VALIDATION'

    def test_validation_invalid_quantity(self, client, buyer_token):
        res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={'crop': 'Wheat', 'quantity_needed_kg': -100, 'max_price_per_kg': 25},
        )
        assert res.status_code == 400
        data = json.loads(res.data)
        assert data['error']['code'] == 'VALIDATION'

    def test_validation_invalid_price(self, client, buyer_token):
        res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={'crop': 'Wheat', 'quantity_needed_kg': 500, 'max_price_per_kg': 0},
        )
        assert res.status_code == 400
        data = json.loads(res.data)
        assert data['error']['code'] == 'VALIDATION'

    def test_validation_invalid_grade(self, client, buyer_token):
        res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={
                'crop': 'Wheat',
                'quantity_needed_kg': 500,
                'max_price_per_kg': 25,
                'min_quality_grade': 'Z',
            },
        )
        assert res.status_code == 400
        data = json.loads(res.data)
        assert data['error']['code'] == 'VALIDATION'


class TestBuyerBidsQuery:
    def test_get_bids_authenticated(self, client, buyer_token):
        # Create a bid first
        client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={'crop': 'Cotton', 'quantity_needed_kg': 3000, 'max_price_per_kg': 65.0},
        )
        res = client.get(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        assert isinstance(data['data'], list)
        assert len(data['data']) >= 1

    def test_get_bids_filter_status(self, client, buyer_token):
        res = client.get(
            '/api/buyer/bids?status=open',
            headers={'Authorization': f'Bearer {buyer_token}'},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        assert all(b['status'] == 'open' for b in data['data'])

    def test_get_bid_detail_success(self, client, buyer_token):
        create_res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={'crop': 'Tomato', 'quantity_needed_kg': 1200, 'max_price_per_kg': 32.0},
        )
        bid_id = json.loads(create_res.data)['data']['id']

        detail_res = client.get(
            f'/api/buyer/bids/{bid_id}',
            headers={'Authorization': f'Bearer {buyer_token}'},
        )
        assert detail_res.status_code == 200
        detail_data = json.loads(detail_res.data)
        assert detail_data['data']['_id'] == bid_id
        assert detail_data['data']['crop'] == 'Tomato'

    def test_other_buyer_cannot_view_bid(self, client, buyer_token, other_buyer_token):
        create_res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={'crop': 'Tomato', 'quantity_needed_kg': 1200, 'max_price_per_kg': 32.0},
        )
        bid_id = json.loads(create_res.data)['data']['id']

        res = client.get(
            f'/api/buyer/bids/{bid_id}',
            headers={'Authorization': f'Bearer {other_buyer_token}'},
        )
        assert res.status_code == 403

    def test_unauthenticated_access_denied(self, client):
        res = client.get('/api/buyer/bids')
        assert res.status_code == 401

    def test_farmer_role_cannot_access_buyer_bids(self, client, farmer_token):
        res = client.get(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {farmer_token}'},
        )
        assert res.status_code == 403


class TestBuyerBidCancel:
    def test_cancel_open_bid(self, client, buyer_token):
        create_res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={'crop': 'Gram', 'quantity_needed_kg': 800, 'max_price_per_kg': 55.0},
        )
        bid_id = json.loads(create_res.data)['data']['id']

        cancel_res = client.post(
            f'/api/buyer/bids/{bid_id}/cancel',
            headers={'Authorization': f'Bearer {buyer_token}'},
        )
        assert cancel_res.status_code == 200
        data = json.loads(cancel_res.data)
        assert data['data']['status'] == 'cancelled'

    def test_cannot_cancel_already_cancelled_bid(self, client, buyer_token):
        create_res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={'crop': 'Gram', 'quantity_needed_kg': 800, 'max_price_per_kg': 55.0},
        )
        bid_id = json.loads(create_res.data)['data']['id']

        client.post(f'/api/buyer/bids/{bid_id}/cancel', headers={'Authorization': f'Bearer {buyer_token}'})
        res2 = client.post(f'/api/buyer/bids/{bid_id}/cancel', headers={'Authorization': f'Bearer {buyer_token}'})
        assert res2.status_code == 400
        assert json.loads(res2.data)['error']['code'] == 'INVALID_STATE'

    def test_cancel_bid_unauthorized_buyer(self, client, buyer_token, other_buyer_token):
        create_res = client.post(
            '/api/buyer/bids',
            headers={'Authorization': f'Bearer {buyer_token}'},
            json={'crop': 'Gram', 'quantity_needed_kg': 800, 'max_price_per_kg': 55.0},
        )
        bid_id = json.loads(create_res.data)['data']['id']

        res = client.post(
            f'/api/buyer/bids/{bid_id}/cancel',
            headers={'Authorization': f'Bearer {other_buyer_token}'},
        )
        assert res.status_code == 403


class TestBuyerBatchesBrowse:
    def test_browse_batches_empty_or_populated(self, client, buyer_token):
        res = client.get(
            '/api/buyer/batches',
            headers={'Authorization': f'Bearer {buyer_token}'},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        assert isinstance(data['data'], list)

    def test_browse_batches_with_data(self, client, buyer_token):
        # Insert a pooled batch
        batch_id = ObjectId()
        doc = {
            '_id': batch_id,
            'crop': 'Wheat',
            'quality_grade': 'A',
            'total_quantity_kg': 5000.0,
            'listing_ids': [ObjectId(), ObjectId()],
            'region': 'Nashik, Maharashtra',
            'status': 'open',
            'created_at': '2026-09-24T12:00:00Z',
        }
        extensions.db.pooled_batches.insert_one(doc)

        res = client.get(
            '/api/buyer/batches',
            headers={'Authorization': f'Bearer {buyer_token}'},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        found = [b for b in data['data'] if b['_id'] == str(batch_id)]
        assert len(found) == 1
        assert found[0]['crop'] == 'Wheat'
        assert found[0]['quality_grade'] == 'A'
        assert found[0]['total_quantity_kg'] == 5000.0
        assert found[0]['listing_count'] == 2

        # Test alias endpoint /api/buyer/browse-batches
        res_alias = client.get(
            '/api/buyer/browse-batches',
            headers={'Authorization': f'Bearer {buyer_token}'},
        )
        assert res_alias.status_code == 200
        data_alias = json.loads(res_alias.data)
        assert any(b['_id'] == str(batch_id) for b in data_alias['data'])

        # Test single batch detail
        detail_res = client.get(
            f'/api/buyer/batches/{batch_id}',
            headers={'Authorization': f'Bearer {buyer_token}'},
        )
        assert detail_res.status_code == 200
        batch_detail = json.loads(detail_res.data)['data']
        assert batch_detail['_id'] == str(batch_id)
        assert batch_detail['crop'] == 'Wheat'

    def test_get_batch_detail_not_found(self, client, buyer_token):
        res = client.get(
            f'/api/buyer/batches/{ObjectId()}',
            headers={'Authorization': f'Bearer {buyer_token}'},
        )
        assert res.status_code == 404
