"""
Tests for Admin Endpoints: Auction Monitor, Auction Trigger, and Pooling Execution.
KrishiSetu - Milestone 11: Dashboard Polish & Admin Command Monitor
"""

import os
import sys
import pytest
from bson import ObjectId

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ['TESTING'] = 'True'
os.environ['MONGODB_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu_test')
os.environ['MONGODB_DB_NAME'] = 'krishisetu_test'
os.environ['JWT_SECRET_KEY'] = 'test-admin-secret-key-32chars-minimum-length-safe'

from flask_jwt_extended import create_access_token
from app import create_app, extensions
from app.models.auction_round import AuctionRound


@pytest.fixture(scope='module')
def app():
    application = create_app()
    yield application

    if extensions.db is not None:
        try:
            extensions.db.users.delete_many({})
            extensions.db.auction_rounds.delete_many({})
            extensions.db.produce_listings.delete_many({})
            extensions.db.bids.delete_many({})
            extensions.db.trades.delete_many({})
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def admin_token(app):
    admin_id = ObjectId()
    doc = {
        '_id': admin_id,
        'role': 'admin',
        'name': 'APMC Super Admin',
        'phone': '9890123456',
        'password_hash': 'hashed_pass',
        'kyc_verified': True,
    }
    extensions.db.users.insert_one(doc)
    with app.app_context():
        return create_access_token(
            identity=str(admin_id),
            additional_claims={'role': 'admin', 'name': 'APMC Super Admin'}
        )


@pytest.fixture
def farmer_token(app):
    farmer_id = ObjectId()
    doc = {
        '_id': farmer_id,
        'role': 'farmer',
        'name': 'Kisan Gaikwad',
        'phone': '9876543210',
        'password_hash': 'hashed_pass',
        'kyc_verified': True,
    }
    extensions.db.users.insert_one(doc)
    with app.app_context():
        return create_access_token(
            identity=str(farmer_id),
            additional_claims={'role': 'farmer', 'name': 'Kisan Gaikwad'}
        )


def test_admin_auctions_unauthorized(client, farmer_token):
    """Accessing /api/admin/auctions without admin role is forbidden."""
    # No auth
    res = client.get('/api/admin/auctions')
    assert res.status_code == 401

    # Farmer auth
    res = client.get('/api/admin/auctions', headers={'Authorization': f"Bearer {farmer_token}"})
    assert res.status_code == 403


def test_admin_get_auctions_success(client, admin_token):
    """Admin can retrieve auction rounds."""
    # Seed a round
    round_doc = AuctionRound.create({
        'crop': 'Onion',
        'window_start': '2026-09-24T10:00:00Z',
        'window_end': '2026-09-24T10:15:00Z',
        'status': 'completed',
        'clearing_price_per_kg': 25.5,
        'matched_trade_ids': [],
    })

    res = client.get('/api/admin/auctions', headers={'Authorization': f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.get_json()['data']
    assert isinstance(data, list)
    assert len(data) >= 1

    matched = [r for r in data if r['id'] == str(round_doc['_id'])]
    assert len(matched) == 1
    assert matched[0]['crop'] == 'Onion'
    assert matched[0]['status'] == 'completed'
    assert matched[0]['clearing_price_per_kg'] == 25.5


def test_admin_trigger_auction_success(client, admin_token):
    """Admin can trigger the double auction engine manually."""
    res = client.post(
        '/api/admin/trigger-auction',
        json={'crop': 'Onion', 'pool_first': False},
        headers={'Authorization': f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    payload = res.get_json()
    assert payload['error'] is None
    data = payload['data']
    assert 'round_count' in data
    assert 'results' in data


def test_admin_trigger_pooling_success(client, admin_token):
    """Admin can trigger the pooling engine manually."""
    res = client.post(
        '/api/admin/trigger-pooling',
        json={'min_quantity_kg': 100, 'max_wait_minutes': 60},
        headers={'Authorization': f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    payload = res.get_json()
    assert payload['error'] is None
    data = payload['data']
    assert 'created_count' in data
    assert 'batches' in data


def test_admin_pooling_preview_success(client, admin_token):
    """Admin can preview pooling results without modifying database."""
    res = client.get(
        '/api/admin/pooling-preview',
        headers={'Authorization': f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    payload = res.get_json()
    assert payload['error'] is None
    data = payload['data']
    assert 'preview_count' in data
    assert 'batches' in data


def test_admin_grading_queue_access(client, admin_token):
    """Admin can access the grading review queue."""
    res = client.get(
        '/api/admin/grading/queue',
        headers={'Authorization': f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    payload = res.get_json()
    assert payload['error'] is None
    data = payload['data']
    assert 'count' in data
    assert 'queue' in data
