"""
Unit & Integration Tests for Milestone 8: Mandi Price Forecasting & Market Data Pipeline.
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
os.environ['JWT_SECRET_KEY'] = 'test-price-forecast-secret-key-32chars-min-length'

from app import create_app, extensions
from app.models.market_price import MarketPrice
from app.market_data.ingest import ingest_from_sources
from app.price_forecast.predict import predict_price


@pytest.fixture(scope='module')
def app():
    application = create_app()
    yield application

    if extensions.db is not None:
        try:
            extensions.db.market_prices.delete_many({})
        except Exception:
            pass


@pytest.fixture
def client(app):
    return app.test_client()


# --- 1. Model Status Diagnostic Endpoint ---

def test_model_status_includes_price_forecast(client):
    """GET /api/ml/model-status reports loaded status and metrics for both models."""
    res = client.get('/api/ml/model-status')
    assert res.status_code == 200
    data = res.get_json()['data']

    assert 'price_forecast_model' in data
    forecast_status = data['price_forecast_model']
    assert forecast_status['loaded'] is True
    assert forecast_status['model_type'] == 'RandomForestRegressor'
    assert 'Soybean' in forecast_status['crops_supported']
    assert 'Nashik' in forecast_status['mandis_supported']
    assert forecast_status['mae_inr_per_quintal'] > 0


# --- 2. Price Forecast Inference Endpoint (Section 6.3) ---

def test_predict_price_with_trained_model(client):
    """POST /api/ml/predict-price for trained crop/mandi runs inference with fallback_used=False."""
    res = client.post(
        '/api/ml/predict-price',
        json={'crop': 'Soybean', 'mandi_name': 'Latur'}
    )
    assert res.status_code == 200
    payload = res.get_json()
    assert payload['error'] is None
    data = payload['data']

    assert data['crop'] == 'Soybean'
    assert data['mandi_name'] == 'Latur'
    assert data['fallback_used'] is False
    assert data['predicted_price_per_quintal'] > 1000.0
    assert data['predicted_price_per_kg'] == round(data['predicted_price_per_quintal'] / 100, 2)
    assert len(data['confidence_interval']) == 2
    assert data['confidence_interval'][0] <= data['predicted_price_per_quintal'] <= data['confidence_interval'][1]
    assert data['trend'] in ['up', 'down', 'stable']
    assert 'recommendation' in data


def test_predict_price_get_query_parameters(client):
    """GET /api/ml/predict-price accepts crop and mandi query parameters."""
    res = client.get('/api/ml/predict-price?crop=Wheat&mandi=Nashik')
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['crop'] == 'Wheat'
    assert data['mandi_name'] == 'Nashik'
    assert data['predicted_price_per_quintal'] > 0


def test_predict_price_fallback_for_unknown_crop(client):
    """
    Section 10 Edge Case 5: When crop/mandi is not in the trained model corpus,
    the API gracefully falls back to moving-average / baseline and flags fallback_used=True.
    """
    res = client.post(
        '/api/ml/predict-price',
        json={'crop': 'Garlic', 'mandi_name': 'Pune'}
    )
    assert res.status_code == 200
    data = res.get_json()['data']

    assert data['crop'] == 'Garlic'
    assert data['fallback_used'] is True
    assert 'fallback_reason' in data
    assert data['predicted_price_per_quintal'] > 0


def test_predict_price_forced_fallback(client):
    """Force fallback mode returns moving average estimate with fallback_used=True."""
    res = client.post(
        '/api/ml/predict-price',
        json={'crop': 'Onion', 'mandi_name': 'Nashik', 'force_fallback': True}
    )
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['fallback_used'] is True
    assert 'Estimate based on' in data.get('fallback_reason', '')


# --- 3. Market Data Ingestion Pipeline & Cross-Check ---

def test_market_data_ingest_from_sources(app):
    """
    ingest_from_sources() pulls from eNAM, Agmarknet, data.gov.in,
    reconciles duplicates, and populates market_prices.
    """
    with app.app_context():
        result = ingest_from_sources(days=7)
        assert result['raw_count'] > 0
        assert result['reconciled_count'] > 0
        assert set(result['sources']) == {'enam', 'agmarknet', 'data_gov_in'}

        # Verify documents inserted into MongoDB
        total_in_db = MarketPrice.count()
        assert total_in_db >= result['reconciled_count']


def test_moving_average_calculation(app):
    """MarketPrice.get_recent_moving_average calculates accurate average across latest prices."""
    with app.app_context():
        # Insert 3 deterministic price entries
        MarketPrice.create({
            'crop': 'TestCrop',
            'mandi_name': 'TestMandi',
            'date': '2026-09-20',
            'modal_price_per_quintal': 2000.0,
            'source': 'test'
        })
        MarketPrice.create({
            'crop': 'TestCrop',
            'mandi_name': 'TestMandi',
            'date': '2026-09-21',
            'modal_price_per_quintal': 2200.0,
            'source': 'test'
        })
        MarketPrice.create({
            'crop': 'TestCrop',
            'mandi_name': 'TestMandi',
            'date': '2026-09-22',
            'modal_price_per_quintal': 2400.0,
            'source': 'test'
        })

        avg = MarketPrice.get_recent_moving_average('TestCrop', 'TestMandi', days=3)
        assert avg == 2200.0


# --- 4. Market Data API Endpoints ---

def test_market_api_prices_endpoint(client):
    """GET /api/market/prices returns historical prices list."""
    res = client.get('/api/market/prices?limit=10')
    assert res.status_code == 200
    payload = res.get_json()
    assert payload['error'] is None
    assert 'prices' in payload['data']


def test_market_api_crops_and_mandis(client):
    """GET /api/market/crops and /api/market/mandis return available listings."""
    res_crops = client.get('/api/market/crops')
    assert res_crops.status_code == 200
    assert len(res_crops.get_json()['data']) > 0

    res_mandis = client.get('/api/market/mandis')
    assert res_mandis.status_code == 200
    assert len(res_mandis.get_json()['data']) > 0


def test_market_api_ingest_trigger(client):
    """POST /api/market/ingest triggers the multi-source ingestion pipeline."""
    res = client.post('/api/market/ingest?days=5')
    assert res.status_code == 200
    payload = res.get_json()
    assert payload['data']['reconciled_count'] > 0
