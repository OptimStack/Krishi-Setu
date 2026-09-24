"""Tests for authentication routes: /api/auth/register, /login, /refresh, /me."""
import json
import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ['TESTING'] = 'True'
os.environ['MONGODB_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu_test')
os.environ['MONGODB_DB_NAME'] = 'krishisetu_test'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key-32chars-minimum-safe-length'

from app import create_app
from app import extensions


@pytest.fixture(scope='module')
def app():
    """Create a test app with a test database."""
    application = create_app()
    yield application

    if extensions.db is not None:
        try:
            extensions.db.users.delete_many({})
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


class TestRegister:
    def test_register_farmer_success(self, client):
        res = client.post('/api/auth/register', json={
            'name': 'Test Farmer',
            'phone': '9999900001',
            'password': 'testpass123',
            'role': 'farmer',
        })
        data = json.loads(res.data)
        assert res.status_code == 201
        assert data['error'] is None
        assert 'access_token' in data['data']
        assert 'refresh_token' in data['data']
        assert data['data']['user']['role'] == 'farmer'
        assert data['data']['user']['phone'] == '9999900001'

    def test_register_buyer_success(self, client):
        res = client.post('/api/auth/register', json={
            'name': 'Test Buyer',
            'phone': '9999900002',
            'password': 'testpass123',
            'role': 'buyer',
        })
        data = json.loads(res.data)
        assert res.status_code == 201
        assert data['data']['user']['role'] == 'buyer'

    def test_register_duplicate_phone(self, client):
        client.post('/api/auth/register', json={
            'name': 'Dup User',
            'phone': '9999900099',
            'password': 'testpass123',
            'role': 'farmer',
        })
        res = client.post('/api/auth/register', json={
            'name': 'Dup User 2',
            'phone': '9999900099',
            'password': 'testpass123',
            'role': 'farmer',
        })
        data = json.loads(res.data)
        assert res.status_code == 409
        assert data['error']['code'] == 'DUPLICATE'

    def test_register_missing_fields(self, client):
        res = client.post('/api/auth/register', json={
            'name': 'No Phone',
        })
        data = json.loads(res.data)
        assert res.status_code == 400
        assert data['error']['code'] == 'VALIDATION'

    def test_register_invalid_role(self, client):
        res = client.post('/api/auth/register', json={
            'name': 'Bad Role',
            'phone': '9999900003',
            'password': 'testpass123',
            'role': 'admin',
        })
        data = json.loads(res.data)
        assert res.status_code == 400


class TestLogin:
    def test_login_with_phone(self, client):
        client.post('/api/auth/register', json={
            'name': 'Login Test',
            'phone': '9999900010',
            'password': 'mypassword',
            'role': 'farmer',
        })
        res = client.post('/api/auth/login', json={
            'phone': '9999900010',
            'password': 'mypassword',
        })
        data = json.loads(res.data)
        assert res.status_code == 200
        assert data['error'] is None
        assert 'access_token' in data['data']
        assert data['data']['user']['name'] == 'Login Test'

    def test_login_wrong_password(self, client):
        res = client.post('/api/auth/login', json={
            'phone': '9999900010',
            'password': 'wrongpassword',
        })
        data = json.loads(res.data)
        assert res.status_code == 401
        assert data['error']['code'] == 'INVALID_CREDENTIALS'

    def test_login_nonexistent_user(self, client):
        res = client.post('/api/auth/login', json={
            'phone': '0000000000',
            'password': 'anything',
        })
        assert res.status_code == 401


class TestProtectedEndpoints:
    def test_me_with_valid_token(self, client):
        reg_res = client.post('/api/auth/register', json={
            'name': 'Me Test',
            'phone': '9999900020',
            'password': 'testpass',
            'role': 'buyer',
        })
        token = json.loads(reg_res.data)['data']['access_token']

        res = client.get('/api/auth/me', headers={
            'Authorization': f'Bearer {token}'
        })
        data = json.loads(res.data)
        assert res.status_code == 200
        assert data['data']['user']['name'] == 'Me Test'
        assert data['data']['user']['role'] == 'buyer'

    def test_me_without_token(self, client):
        res = client.get('/api/auth/me')
        assert res.status_code == 401

    def test_protected_route_wrong_role(self, client):
        reg_res = client.post('/api/auth/register', json={
            'name': 'Farmer Not Buyer',
            'phone': '9999900030',
            'password': 'testpass',
            'role': 'farmer',
        })
        token = json.loads(reg_res.data)['data']['access_token']

        res = client.get('/api/buyer/bids', headers={
            'Authorization': f'Bearer {token}'
        })
        assert res.status_code == 403


class TestRefreshToken:
    def test_refresh_returns_new_access_token(self, client):
        reg_res = client.post('/api/auth/register', json={
            'name': 'Refresh Test',
            'phone': '9999900040',
            'password': 'testpass',
            'role': 'farmer',
        })
        refresh_token = json.loads(reg_res.data)['data']['refresh_token']

        res = client.post('/api/auth/refresh', headers={
            'Authorization': f'Bearer {refresh_token}'
        })
        data = json.loads(res.data)
        assert res.status_code == 200
        assert 'access_token' in data['data']
