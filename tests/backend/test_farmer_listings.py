"""Unit & integration tests for Milestone 3: Farmer Module (Listings & Payouts)."""
import io
import json
import os
import sys
import pytest
from bson import ObjectId

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ['TESTING'] = 'True'
os.environ['MONGODB_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu_test')
os.environ['MONGODB_DB_NAME'] = 'krishisetu_test'
os.environ['JWT_SECRET_KEY'] = 'test-farmer-secret-key-32chars-minimum-length-safe'

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
            extensions.db.produce_listings.delete_many({})
            extensions.db.trades.delete_many({})
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def farmer_user(app):
    """Creates a farmer user in the test database and returns user document."""
    farmer_id = ObjectId()
    doc = {
        '_id': farmer_id,
        'role': 'farmer',
        'name': 'Kisan Patil',
        'phone': f"98{farmer_id.generation_time.microsecond:06d}01",
        'password_hash': 'dummy_hash',
        'location': {'district': 'Nashik', 'state': 'Maharashtra'},
        'kyc_verified': True,
        'created_at': '2026-09-24T12:00:00Z',
    }
    extensions.db.users.insert_one(doc)
    return doc


@pytest.fixture
def farmer_token(app, farmer_user):
    """Generates a valid farmer access token."""
    with app.app_context():
        return create_access_token(
            identity=str(farmer_user['_id']),
            additional_claims={'role': 'farmer'}
        )


@pytest.fixture
def buyer_user(app):
    """Creates a buyer user in the test database and returns user document."""
    buyer_id = ObjectId()
    doc = {
        '_id': buyer_id,
        'role': 'buyer',
        'name': 'Agro Processor Ltd',
        'phone': f"98{buyer_id.generation_time.microsecond:06d}02",
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


class TestFarmerListingsCreate:
    def test_create_listing_json_success(self, client, farmer_token):
        res = client.post(
            '/api/farmer/listings',
            headers={'Authorization': f'Bearer {farmer_token}'},
            json={
                'crop': 'Onion',
                'variety': 'Nashik Red',
                'quantity_kg': 1500,
                'ask_price_per_kg': 25.50,
                'min_acceptable_price_per_kg': 22.00,
                'quality_grade': 'A',
            },
        )
        assert res.status_code == 201
        data = json.loads(res.data)
        assert data['error'] is None
        listing = data['data']['listing']
        assert listing['crop'] == 'Onion'
        assert listing['quantity_kg'] == 1500.0
        assert listing['quantity_remaining_kg'] == 1500.0
        assert listing['ask_price_per_kg'] == 25.50
        assert listing['min_acceptable_price_per_kg'] == 22.00
        assert listing['quality_grade'] == 'A'
        assert listing['status'] == 'open'

    def test_create_listing_multipart_with_photo(self, client, farmer_token):
        fake_image = (io.BytesIO(b'fake-image-bytes'), 'crop.jpg')
        res = client.post(
            '/api/farmer/listings',
            headers={'Authorization': f'Bearer {farmer_token}'},
            content_type='multipart/form-data',
            data={
                'crop': 'Tomato',
                'variety': 'Vaibhav',
                'quantity_kg': '800',
                'ask_price_per_kg': '18.00',
                'quality_grade': 'B',
                'photo': fake_image,
            },
        )
        assert res.status_code == 201
        data = json.loads(res.data)
        listing = data['data']['listing']
        assert listing['crop'] == 'Tomato'
        assert listing['image_url'] is not None
        assert listing['image_url'].startswith('/uploads/')

    def test_validation_missing_crop(self, client, farmer_token):
        res = client.post(
            '/api/farmer/listings',
            headers={'Authorization': f'Bearer {farmer_token}'},
            json={'quantity_kg': 500, 'ask_price_per_kg': 20},
        )
        assert res.status_code == 400
        data = json.loads(res.data)
        assert data['error']['code'] == 'VALIDATION'

    def test_validation_invalid_quantity(self, client, farmer_token):
        res = client.post(
            '/api/farmer/listings',
            headers={'Authorization': f'Bearer {farmer_token}'},
            json={'crop': 'Soybean', 'quantity_kg': -10, 'ask_price_per_kg': 40},
        )
        assert res.status_code == 400

    def test_validation_min_price_exceeds_ask_price(self, client, farmer_token):
        res = client.post(
            '/api/farmer/listings',
            headers={'Authorization': f'Bearer {farmer_token}'},
            json={
                'crop': 'Wheat',
                'quantity_kg': 1000,
                'ask_price_per_kg': 24,
                'min_acceptable_price_per_kg': 30,  # Invalid: min > ask
            },
        )
        assert res.status_code == 400
        data = json.loads(res.data)
        assert 'cannot exceed' in data['error']['message']


class TestFarmerListingsQuery:
    def test_get_listings_authenticated(self, client, farmer_token):
        client.post(
            '/api/farmer/listings',
            headers={'Authorization': f'Bearer {farmer_token}'},
            json={'crop': 'Wheat', 'quantity_kg': 600, 'ask_price_per_kg': 23},
        )
        res = client.get(
            '/api/farmer/listings',
            headers={'Authorization': f'Bearer {farmer_token}'},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        assert isinstance(data['data'], list)
        assert len(data['data']) >= 1

    def test_unauthenticated_access_denied(self, client):
        res = client.get('/api/farmer/listings')
        assert res.status_code == 401

    def test_buyer_role_cannot_access_farmer_listings(self, client, buyer_token):
        res = client.get(
            '/api/farmer/listings',
            headers={'Authorization': f'Bearer {buyer_token}'},
        )
        assert res.status_code == 403


class TestFarmerListingCancel:
    def test_cancel_open_listing(self, client, farmer_token):
        create_res = client.post(
            '/api/farmer/listings',
            headers={'Authorization': f'Bearer {farmer_token}'},
            json={'crop': 'Gram', 'quantity_kg': 400, 'ask_price_per_kg': 52},
        )
        listing_id = json.loads(create_res.data)['data']['id']

        cancel_res = client.post(
            f'/api/farmer/listings/{listing_id}/cancel',
            headers={'Authorization': f'Bearer {farmer_token}'},
        )
        assert cancel_res.status_code == 200
        data = json.loads(cancel_res.data)
        assert data['data']['status'] == 'cancelled'


class TestFarmerPayouts:
    def test_get_farmer_payouts_empty(self, client, farmer_token):
        res = client.get(
            '/api/farmer/payouts',
            headers={'Authorization': f'Bearer {farmer_token}'},
        )
        assert res.status_code == 200
        data = json.loads(res.data)
        assert isinstance(data['data'], list)
