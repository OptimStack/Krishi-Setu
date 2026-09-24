"""
Unit & Integration Tests for Milestone 9: Payments (Razorpay), Settlement Distribution & Webhooks.
SIH 2026 - Team KS-SAND
"""

import json
import os
import sys
import pytest
from bson import ObjectId

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ['TESTING'] = 'True'
os.environ['MONGODB_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu_test')
os.environ['MONGODB_DB_NAME'] = 'krishisetu_test'
os.environ['JWT_SECRET_KEY'] = 'test-payments-secret-key-32chars-min-length-safe'
os.environ['RAZORPAY_KEY_ID'] = 'rzp_test_sample_key'
os.environ['RAZORPAY_KEY_SECRET'] = 'sample_secret_key_123'
os.environ['RAZORPAY_WEBHOOK_SECRET'] = 'sample_webhook_secret_456'

from flask_jwt_extended import create_access_token
from app import create_app, extensions
from app.models.trade import Trade
from app.models.payment import Payment
from app.models.produce_listing import ProduceListing
from app.models.pooled_batch import PooledBatch
from app.payments.payout_split import calculate_payout_splits


@pytest.fixture(scope='module')
def app():
    application = create_app()
    yield application

    if extensions.db is not None:
        try:
            extensions.db.trades.delete_many({})
            extensions.db.payments.delete_many({})
            extensions.db.produce_listings.delete_many({})
            extensions.db.pooled_batches.delete_many({})
            extensions.db.users.delete_many({})
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def buyer_user(app):
    buyer_id = ObjectId()
    doc = {
        '_id': buyer_id,
        'role': 'buyer',
        'name': 'BigBasket Procurement',
        'phone': f"92{buyer_id.generation_time.microsecond:06d}01",
        'password_hash': 'dummy_hash',
        'kyc_verified': True,
        'created_at': '2026-09-24T12:00:00Z',
    }
    extensions.db.users.insert_one(doc)
    return doc


@pytest.fixture
def other_buyer_user(app):
    buyer_id = ObjectId()
    doc = {
        '_id': buyer_id,
        'role': 'buyer',
        'name': 'Reliance Fresh',
        'phone': f"93{buyer_id.generation_time.microsecond:06d}02",
        'password_hash': 'dummy_hash',
        'kyc_verified': True,
        'created_at': '2026-09-24T12:00:00Z',
    }
    extensions.db.users.insert_one(doc)
    return doc


@pytest.fixture
def farmer_user(app):
    farmer_id = ObjectId()
    doc = {
        '_id': farmer_id,
        'role': 'farmer',
        'name': 'Dnyaneshwar Shinde',
        'phone': f"94{farmer_id.generation_time.microsecond:06d}03",
        'password_hash': 'dummy_hash',
        'kyc_verified': True,
        'created_at': '2026-09-24T12:00:00Z',
    }
    extensions.db.users.insert_one(doc)
    return doc


@pytest.fixture
def buyer_token(app, buyer_user):
    with app.app_context():
        return create_access_token(
            identity=str(buyer_user['_id']),
            additional_claims={'role': 'buyer', 'name': buyer_user['name']}
        )


@pytest.fixture
def other_buyer_token(app, other_buyer_user):
    with app.app_context():
        return create_access_token(
            identity=str(other_buyer_user['_id']),
            additional_claims={'role': 'buyer', 'name': other_buyer_user['name']}
        )


@pytest.fixture
def sample_trade_setup(app, buyer_user, farmer_user):
    """Sets up a complete batch trade with pooled batch and contributing listing."""
    with app.app_context():
        # 1. Contributing Listing
        listing = ProduceListing.create({
            'farmer_id': farmer_user['_id'],
            'crop': 'Onion',
            'quantity_kg': 1000.0,
            'ask_price_per_kg': 20.0,
            'quality_grade': 'A',
        })

        # 2. Pooled Batch
        batch = PooledBatch.create({
            'crop': 'Onion',
            'quality_grade': 'A',
            'total_quantity_kg': 1000.0,
            'listing_ids': [listing['_id']],
            'region': 'Nashik',
            'status': 'locked_for_auction'
        })

        # 3. Trade
        trade = Trade.create({
            'auction_round_id': ObjectId(),
            'buyer_id': buyer_user['_id'],
            'pooled_batch_id': batch['_id'],
            'crop': 'Onion',
            'quantity_kg': 1000.0,
            'clearing_price_per_kg': 22.50,
            'total_amount': 22500.0,
            'status': 'pending_payment',
            'farmer_shares': [
                {
                    'farmer_id': farmer_user['_id'],
                    'listing_id': listing['_id'],
                    'quantity_kg': 1000.0,
                    'payout_amount': 22500.0,
                }
            ]
        })

        return {
            'listing': listing,
            'batch': batch,
            'trade': trade,
            'trade_id': str(trade['_id'])
        }


# --- 1. Order Creation & Idempotency Tests (Milestone 9.1 & 9.2) ---

def test_create_payment_order_success(client, buyer_token, sample_trade_setup):
    """Buyer creates a Razorpay payment order for their matched auction trade."""
    trade_id = sample_trade_setup['trade_id']
    res = client.post(
        '/api/payments/create-order',
        headers={'Authorization': f'Bearer {buyer_token}'},
        json={'trade_id': trade_id}
    )
    assert res.status_code == 201
    payload = res.get_json()
    assert payload['error'] is None
    data = payload['data']

    assert data['trade_id'] == trade_id
    assert data['amount'] == 22500.0
    assert data['amount_paise'] == 2250000
    assert data['currency'] == 'INR'
    assert data['order_id'].startswith('order_')
    assert data['idempotent_reuse'] is False

    # Verify payment record in DB
    payment = Payment.find_by_trade(trade_id)
    assert payment is not None
    assert payment['razorpay_order_id'] == data['order_id']
    assert payment['status'] == 'created'

    # Verify trade updated to payment_processing
    trade = Trade.find_by_id(trade_id)
    assert trade['status'] == 'payment_processing'


def test_create_payment_order_idempotency(client, buyer_token, sample_trade_setup):
    """
    Milestone 9.2: Repeated POST /api/payments/create-order for the same trade
    must be idempotent, returning the existing razorpay_order_id without duplicating records.
    """
    trade_id = sample_trade_setup['trade_id']

    # Call 1: creates or retrieves
    res1 = client.post(
        '/api/payments/create-order',
        headers={'Authorization': f'Bearer {buyer_token}'},
        json={'trade_id': trade_id}
    )
    order_id_1 = res1.get_json()['data']['order_id']

    # Call 2: must reuse existing order_id
    res2 = client.post(
        '/api/payments/create-order',
        headers={'Authorization': f'Bearer {buyer_token}'},
        json={'trade_id': trade_id}
    )
    assert res2.status_code == 200
    data2 = res2.get_json()['data']
    assert data2['order_id'] == order_id_1
    assert data2['idempotent_reuse'] is True


def test_create_payment_order_unauthorized_buyer(client, other_buyer_token, sample_trade_setup):
    """Another buyer cannot create payment orders for someone else's trade."""
    trade_id = sample_trade_setup['trade_id']
    res = client.post(
        '/api/payments/create-order',
        headers={'Authorization': f'Bearer {other_buyer_token}'},
        json={'trade_id': trade_id}
    )
    assert res.status_code == 403
    payload = res.get_json()
    assert payload['error']['code'] == 'FORBIDDEN'


# --- 2. Payment Verification & Trade Settlement Tests ---

def test_verify_payment_success_and_farmer_payout_distribution(client, buyer_token, sample_trade_setup):
    """
    Verifying payment signature marks Payment captured, Trade settled,
    and updates contributing ProduceListings and PooledBatch.
    """
    trade_id = sample_trade_setup['trade_id']

    # 1. Get or create order
    order_res = client.post(
        '/api/payments/create-order',
        headers={'Authorization': f'Bearer {buyer_token}'},
        json={'trade_id': trade_id}
    )
    order_id = order_res.get_json()['data']['order_id']

    # 2. Verify payment
    verify_res = client.post(
        '/api/payments/verify',
        headers={'Authorization': f'Bearer {buyer_token}'},
        json={
            'trade_id': trade_id,
            'razorpay_order_id': order_id,
            'razorpay_payment_id': 'pay_test_987654321',
            'razorpay_signature': 'test_sig_verified_123',
        }
    )
    assert verify_res.status_code == 200
    payload = verify_res.get_json()
    assert payload['error'] is None
    data = payload['data']
    assert data['status'] == 'settled'

    # 3. Verify Database State
    trade = Trade.find_by_id(trade_id)
    assert trade['status'] == 'settled'
    assert trade['settled_at'] is not None

    payment = Payment.find_by_razorpay_order(order_id)
    assert payment['status'] == 'captured'
    assert payment['razorpay_payment_id'] == 'pay_test_987654321'

    # Contributing listing must now be settled
    listing = ProduceListing.find_by_id(sample_trade_setup['listing']['_id'])
    assert listing['status'] == 'settled'

    # Pooled batch must now be closed
    batch = PooledBatch.find_by_id(sample_trade_setup['batch']['_id'])
    assert batch['status'] == 'closed'


def test_verify_payment_invalid_signature_rejected(client, buyer_token, sample_trade_setup):
    """Invalid payment signature returns 400."""
    trade_id = sample_trade_setup['trade_id']
    res = client.post(
        '/api/payments/verify',
        headers={'Authorization': f'Bearer {buyer_token}'},
        json={
            'trade_id': trade_id,
            'razorpay_order_id': 'order_fake_123',
            'razorpay_payment_id': 'pay_fake_456',
            'razorpay_signature': 'bad_tampered_signature',
        }
    )
    assert res.status_code == 400
    payload = res.get_json()
    assert payload['error']['code'] == 'INVALID_SIGNATURE'


# --- 3. Razorpay Webhooks (Captured & Failed Edge Case 9) ---

def test_razorpay_webhook_payment_captured(client, sample_trade_setup):
    """
    Webhook payment.captured event idempotently settles trade
    and sets webhook_verified=True.
    """
    trade_id = sample_trade_setup['trade_id']
    order_id = f"order_hook_{ObjectId()}"

    # Setup payment doc in DB
    Payment.create({
        'trade_id': ObjectId(trade_id),
        'razorpay_order_id': order_id,
        'amount': 22500.0,
        'status': 'created',
        'webhook_verified': False
    })

    webhook_payload = json.dumps({
        'event': 'payment.captured',
        'payload': {
            'payment': {
                'entity': {
                    'id': 'pay_webhook_999',
                    'order_id': order_id,
                    'amount': 2250000,
                    'status': 'captured'
                }
            }
        }
    }).encode('utf-8')

    res = client.post(
        '/api/payments/webhook',
        data=webhook_payload,
        headers={
            'Content-Type': 'application/json',
            'X-Razorpay-Signature': 'valid_webhook_signature',
        }
    )
    assert res.status_code == 200
    assert res.get_json()['status'] == 'ok'

    payment = Payment.find_by_razorpay_order(order_id)
    assert payment['status'] == 'captured'
    assert payment['webhook_verified'] is True


def test_razorpay_webhook_payment_failed_reopens_lots(client, sample_trade_setup):
    """
    Section 9 Edge Case 9: When payment fails, the trade status becomes 'failed'
    and the pooled batch / produce listings reopen for the next auction round.
    """
    trade_id = sample_trade_setup['trade_id']
    order_id = f"order_failed_{ObjectId()}"

    Payment.create({
        'trade_id': ObjectId(trade_id),
        'razorpay_order_id': order_id,
        'amount': 22500.0,
        'status': 'created',
    })

    webhook_payload = json.dumps({
        'event': 'payment.failed',
        'payload': {
            'payment': {
                'entity': {
                    'id': 'pay_failed_123',
                    'order_id': order_id,
                    'error_description': 'Customer card bank declined'
                }
            }
        }
    }).encode('utf-8')

    res = client.post(
        '/api/payments/webhook',
        data=webhook_payload,
        headers={
            'Content-Type': 'application/json',
            'X-Razorpay-Signature': 'valid_webhook_signature',
        }
    )
    assert res.status_code == 200

    # Trade must be marked failed
    trade = Trade.find_by_id(trade_id)
    assert trade['status'] == 'failed'

    # Batch and listings must be reopened
    batch = PooledBatch.find_by_id(sample_trade_setup['batch']['_id'])
    assert batch['status'] == 'open'

    listing = ProduceListing.find_by_id(sample_trade_setup['listing']['_id'])
    assert listing['status'] == 'open'


def test_razorpay_webhook_missing_signature_rejected(client):
    """Webhook without X-Razorpay-Signature is rejected with 400."""
    res = client.post(
        '/api/payments/webhook',
        data=json.dumps({'event': 'payment.captured'}),
        content_type='application/json'
    )
    assert res.status_code == 400
    assert res.get_json()['error']['code'] == 'MISSING_SIGNATURE'


# --- 4. Pure Pro-Rata Math Calculation Test ---

def test_payout_splits_pure_calculation():
    """calculate_payout_splits correctly divides auction proceeds with zero penny loss."""
    contributors = [
        {'farmer_id': 'F1', 'quantity_kg': 300.0},
        {'farmer_id': 'F2', 'quantity_kg': 700.0},
    ]
    splits = calculate_payout_splits(total_amount=25000.0, contributors=contributors)
    assert len(splits) == 2
    assert splits[0]['payout_amount'] == 7500.0
    assert splits[0]['share_percentage'] == 30.0
    assert splits[1]['payout_amount'] == 17500.0
    assert splits[1]['share_percentage'] == 70.0
    assert sum(s['payout_amount'] for s in splits) == 25000.0
