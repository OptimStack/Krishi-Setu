"""
Unit & Integration Tests for Milestone 7: AI Quality Grading (ML Isolated Testing, Farmer Wiring & Admin Review Queue).
SIH 2026 - Team KS-SAND
"""

import io
import os
import sys
import pytest
from bson import ObjectId
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ['TESTING'] = 'True'
os.environ['MONGODB_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu_test')
os.environ['MONGODB_DB_NAME'] = 'krishisetu_test'
os.environ['JWT_SECRET_KEY'] = 'test-grading-secret-key-32chars-minimum-length-safe'
os.environ['GRADING_CONFIDENCE_THRESHOLD'] = '0.70'

from flask_jwt_extended import create_access_token
from app import create_app, extensions
from app.models.grading_record import GradingRecord
from app.models.produce_listing import ProduceListing


def _generate_synthetic_image_bytes(color=(180, 60, 50)):
    """Generates a small in-memory JPEG image for testing."""
    img = Image.new('RGB', (120, 120), color=color)
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    return buf


@pytest.fixture(scope='module')
def app():
    application = create_app()
    yield application

    if extensions.db is not None:
        try:
            extensions.db.users.delete_many({})
            extensions.db.produce_listings.delete_many({})
            extensions.db.grading_records.delete_many({})
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def farmer_user(app):
    farmer_id = ObjectId()
    doc = {
        '_id': farmer_id,
        'role': 'farmer',
        'name': 'Ganesh Gaikwad',
        'phone': f"91{farmer_id.generation_time.microsecond:06d}02",
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
            additional_claims={'role': 'farmer', 'name': farmer_user['name']}
        )


@pytest.fixture
def admin_user(app):
    admin_id = ObjectId()
    doc = {
        '_id': admin_id,
        'role': 'admin',
        'name': 'APMC Assessor Admin',
        'phone': f"99{admin_id.generation_time.microsecond:06d}09",
        'password_hash': 'dummy_hash',
        'location': {'district': 'Pune', 'state': 'Maharashtra'},
        'kyc_verified': True,
        'created_at': '2026-09-24T12:00:00Z',
    }
    extensions.db.users.insert_one(doc)
    return doc


@pytest.fixture
def admin_token(app, admin_user):
    with app.app_context():
        return create_access_token(
            identity=str(admin_user['_id']),
            additional_claims={'role': 'admin', 'name': admin_user['name']}
        )


# --- 1. Isolated ML Endpoints Tests (Section 6.2 & 6.4) ---

def test_model_status_endpoint(client):
    """GET /api/ml/model-status returns loaded status and metrics."""
    res = client.get('/api/ml/model-status')
    assert res.status_code == 200
    data = res.get_json()['data']

    assert 'grading_model' in data
    grading_model = data['grading_model']
    assert grading_model['loaded'] is True
    assert grading_model['accuracy'] >= 0.90
    assert 'Grade A' in grading_model['classes']
    assert 'price_forecast_model' in data


def test_isolated_grade_produce_valid_image(client):
    """POST /api/ml/grade-produce accepts valid produce photo and returns prediction."""
    img_buf = _generate_synthetic_image_bytes(color=(200, 50, 40))
    res = client.post(
        '/api/ml/grade-produce',
        data={
            'photo': (img_buf, 'fresh_tomato.jpg'),
            'crop': 'Tomato'
        },
        content_type='multipart/form-data'
    )
    assert res.status_code == 200
    payload = res.get_json()
    assert payload['error'] is None
    data = payload['data']
    assert data['predicted_grade'] in ['A', 'B', 'C']
    assert 0.0 <= data['confidence'] <= 1.0
    assert isinstance(data['needs_human_review'], bool)
    assert 'class_probabilities' in data


def test_isolated_grade_produce_missing_image(client):
    """POST /api/ml/grade-produce returns 400 when image is missing."""
    res = client.post(
        '/api/ml/grade-produce',
        data={'crop': 'Tomato'},
        content_type='multipart/form-data'
    )
    assert res.status_code == 400
    payload = res.get_json()
    assert payload['error']['code'] == 'MISSING_IMAGE'


def test_isolated_grade_produce_invalid_extension(client):
    """POST /api/ml/grade-produce returns 400 for unsupported file extension."""
    txt_buf = io.BytesIO(b'Not an image')
    res = client.post(
        '/api/ml/grade-produce',
        data={'photo': (txt_buf, 'document.pdf')},
        content_type='multipart/form-data'
    )
    assert res.status_code == 400
    payload = res.get_json()
    assert payload['error']['code'] == 'INVALID_IMAGE_FORMAT'


# --- 2. Farmer Listing Photo Upload & AI Grading Integration ---

def test_farmer_listing_with_clear_photo_auto_graded(client, farmer_token, app):
    """
    Submitting a produce listing with a clear photo auto-assigns quality_grade
    and creates a linked GradingRecord.
    """
    img_buf = _generate_synthetic_image_bytes(color=(190, 70, 50))
    res = client.post(
        '/api/farmer/listings',
        headers={'Authorization': f'Bearer {farmer_token}'},
        data={
            'crop': 'Tomato',
            'variety': 'Nashik Red',
            'quantity_kg': '800',
            'ask_price_per_kg': '22.0',
            'photo': (img_buf, 'field_tomato.jpg')
        },
        content_type='multipart/form-data'
    )
    assert res.status_code == 201
    payload = res.get_json()
    assert payload['error'] is None

    listing = payload['data']['listing']
    grading = payload['data'].get('grading')
    assert listing['crop'] == 'Tomato'
    assert listing['quality_grade'] in ['A', 'B', 'C', 'ungraded']
    assert listing.get('grading_record_id') is not None

    # Verify GradingRecord exists in database
    with app.app_context():
        record = GradingRecord.find_by_id(listing['grading_record_id'])
        assert record is not None
        assert record['predicted_grade'] in ['A', 'B', 'C']
        assert record['listing_id'] == ObjectId(listing['id'])


def test_farmer_listing_low_confidence_routes_to_review_queue(client, farmer_token, app, monkeypatch):
    """
    When AI confidence is below threshold, listing quality_grade remains 'ungraded'
    and lands in the human review queue with needs_human_review = True.
    """
    # Monkeypatch infer_grade to simulate ambiguous photo with low confidence
    from app.grading import infer

    def mock_low_confidence(image_input, crop_type=None, threshold=None):
        return {
            'predicted_grade': 'B',
            'grade_label': 'Grade B',
            'confidence': 0.55,  # Below 0.70 threshold
            'needs_human_review': True,
            'class_probabilities': {'A': 0.20, 'B': 0.55, 'C': 0.25},
            'crop': crop_type,
            'fallback_used': False
        }

    monkeypatch.setattr(infer, 'infer_grade', mock_low_confidence)

    img_buf = _generate_synthetic_image_bytes(color=(100, 100, 100))
    res = client.post(
        '/api/farmer/listings',
        headers={'Authorization': f'Bearer {farmer_token}'},
        data={
            'crop': 'Soybean',
            'quantity_kg': '1200',
            'ask_price_per_kg': '45.0',
            'photo': (img_buf, 'ambiguous_crop.jpg')
        },
        content_type='multipart/form-data'
    )
    assert res.status_code == 201
    payload = res.get_json()
    listing = payload['data']['listing']
    grading = payload['data']['grading']

    # Must respect needs_human_review: true and not falsely claim high confidence
    assert grading['needs_human_review'] is True
    assert listing['quality_grade'] == 'ungraded'

    # Verify pending review queue contains this record
    with app.app_context():
        pending = GradingRecord.find_pending_review()
        pending_ids = [str(r['_id']) for r in pending]
        assert str(listing['grading_record_id']) in pending_ids


# --- 3. Admin Review Queue & Manual Override Integration ---

def test_admin_grading_queue_and_manual_override(client, admin_token, farmer_token, app, monkeypatch):
    """
    Admin can fetch the review queue and manually override/verify the grade.
    The override updates both the GradingRecord and the associated ProduceListing.
    """
    from app.grading import infer

    def mock_ambiguous_grade(image_input, crop_type=None, threshold=None):
        return {
            'predicted_grade': 'B',
            'grade_label': 'Grade B',
            'confidence': 0.61,
            'needs_human_review': True,
            'class_probabilities': {'A': 0.15, 'B': 0.61, 'C': 0.24},
            'crop': crop_type,
            'fallback_used': False
        }

    monkeypatch.setattr(infer, 'infer_grade', mock_ambiguous_grade)

    # 1. Create a listing that triggers review queue
    img_buf = _generate_synthetic_image_bytes(color=(120, 120, 120))
    create_res = client.post(
        '/api/farmer/listings',
        headers={'Authorization': f'Bearer {farmer_token}'},
        data={
            'crop': 'Wheat',
            'quantity_kg': '2000',
            'ask_price_per_kg': '28.0',
            'photo': (img_buf, 'wheat_sample.jpg')
        },
        content_type='multipart/form-data'
    )
    assert create_res.status_code == 201
    created_listing = create_res.get_json()['data']['listing']
    record_id = created_listing['grading_record_id']
    listing_id = created_listing['id']

    # 2. Admin retrieves queue
    queue_res = client.get(
        '/api/admin/grading/queue',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert queue_res.status_code == 200
    queue_data = queue_res.get_json()['data']
    assert queue_data['count'] >= 1
    queue_record_ids = [str(item['_id']) for item in queue_data['queue']]
    assert record_id in queue_record_ids

    # 3. Admin manually overrides to Grade A
    override_res = client.post(
        f'/api/admin/grading/{record_id}/override',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'override_grade': 'A'}
    )
    assert override_res.status_code == 200
    override_data = override_res.get_json()['data']
    assert override_data['record']['manual_override_grade'] == 'A'
    assert override_data['record']['needs_human_review'] is False
    assert override_data['listing']['quality_grade'] == 'A'

    # 4. Verify in DB
    with app.app_context():
        updated_listing = ProduceListing.find_by_id(listing_id)
        assert updated_listing['quality_grade'] == 'A'

        updated_record = GradingRecord.find_by_id(record_id)
        assert updated_record['manual_override_grade'] == 'A'
        assert updated_record['needs_human_review'] is False

        # Record should no longer be in pending review
        pending_after = GradingRecord.find_pending_review()
        pending_after_ids = [str(r['_id']) for r in pending_after]
        assert record_id not in pending_after_ids


def test_admin_override_invalid_grade_rejected(client, admin_token):
    """Admin override with invalid grade returns 400."""
    fake_id = str(ObjectId())
    res = client.post(
        f'/api/admin/grading/{fake_id}/override',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'override_grade': 'Z'}
    )
    assert res.status_code == 400
    payload = res.get_json()
    assert payload['error']['code'] == 'INVALID_GRADE'
