"""
Unit & Integration Tests for Milestone 10: Warehouse & Silo Finder (Geo-Search & Crop Compatibility).
SIH 2026 - Team KS-SAND
"""

import os
import sys
import pytest
from bson import ObjectId

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ['TESTING'] = 'True'
os.environ['MONGODB_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu_test')
os.environ['MONGODB_DB_NAME'] = 'krishisetu_test'
os.environ['JWT_SECRET_KEY'] = 'test-warehouse-secret-key-32chars-min-length-safe'

from app import create_app, extensions
from app.models.warehouse import Warehouse
from app.warehouse.seed_data import ensure_warehouses_seeded


@pytest.fixture(scope='module')
def app():
    application = create_app()
    yield application

    if extensions.db is not None:
        try:
            extensions.db.warehouses.delete_many({})
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


# --- 1. Geo-Search & Distance Sorting Tests (Milestone 10.3) ---

def test_warehouse_nearby_sorted_by_distance(client):
    """
    GET /api/warehouse/nearby from Nashik coordinates returns facilities
    strictly sorted by distance ascending.
    """
    res = client.get('/api/warehouse/nearby?lat=19.9975&lng=73.7898&max_distance_km=250')
    assert res.status_code == 200
    payload = res.get_json()
    assert payload['error'] is None
    data = payload['data']
    warehouses = data['warehouses']

    assert len(warehouses) >= 3
    # Check strict ascending order of distance
    distances = [w['distance_km'] for w in warehouses]
    for i in range(len(distances) - 1):
        assert distances[i] <= distances[i + 1]

    # Closest warehouse to Nashik coordinates must be the Nashik Central Warehouse (< 10 km)
    closest = warehouses[0]
    assert 'Nashik' in closest['name']
    assert closest['distance_km'] < 10.0
    assert ('km away' in closest['distance_text'] or 'Nearby' in closest['distance_text'])


def test_warehouse_nearby_crop_filter(client):
    """Filtering nearby warehouses by crop returns only compatible facilities."""
    res = client.get('/api/warehouse/nearby?crop=Cotton&max_distance_km=500')
    assert res.status_code == 200
    data = res.get_json()['data']
    warehouses = data['warehouses']

    assert len(warehouses) > 0
    for w in warehouses:
        supported = [c.lower() for c in w['crop_types_supported']]
        assert 'cotton' in supported


def test_warehouse_nearby_type_filter(client):
    """Filtering by facility type (cold_storage vs silo vs warehouse) works as expected."""
    res = client.get('/api/warehouse/nearby?type=cold_storage&max_distance_km=500')
    assert res.status_code == 200
    warehouses = res.get_json()['data']['warehouses']

    assert len(warehouses) > 0
    for w in warehouses:
        assert w['type'] == 'cold_storage'


def test_warehouse_nearby_distance_cutoff(client):
    """max_distance_km limits facilities beyond the radius."""
    res = client.get('/api/warehouse/nearby?lat=19.9975&lng=73.7898&max_distance_km=15')
    assert res.status_code == 200
    warehouses = res.get_json()['data']['warehouses']

    for w in warehouses:
        assert w['distance_km'] <= 15.0


def test_warehouse_default_coordinates_fallback(client):
    """Omitting lat/lng falls back gracefully to default regional coordinates without error."""
    res = client.get('/api/warehouse/nearby')
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['origin']['lat'] == 19.9975
    assert len(data['warehouses']) > 0


# --- 2. Detail Lookup & Seeding Tests ---

def test_warehouse_detail_endpoint(client, app):
    """GET /api/warehouse/<id> returns specific facility details."""
    with app.app_context():
        wh = Warehouse.create({
            'name': 'Test Grain Silo Terminal',
            'type': 'silo',
            'coordinates': [74.5, 18.2],
            'capacity_tonnes': 8000.0,
            'crop_types_supported': ['Wheat', 'Maize'],
            'contact_phone': '+91 9999999999',
            'address': 'Baramati Highway'
        })
        wh_id = str(wh['_id'])

    res = client.get(f'/api/warehouse/{wh_id}')
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['name'] == 'Test Grain Silo Terminal'
    assert data['type'] == 'silo'
    assert data['capacity_tonnes'] == 8000.0


def test_warehouse_detail_not_found(client):
    """GET /api/warehouse/<non_existent_id> returns 404."""
    fake_id = str(ObjectId())
    res = client.get(f'/api/warehouse/{fake_id}')
    assert res.status_code == 404
    assert res.get_json()['error']['code'] == 'NOT_FOUND'


def test_warehouse_seed_endpoint(client):
    """POST /api/warehouse/seed ensures facilities exist in collection."""
    res = client.post('/api/warehouse/seed')
    assert res.status_code == 200
    assert res.get_json()['data']['seeded_count'] >= 10
