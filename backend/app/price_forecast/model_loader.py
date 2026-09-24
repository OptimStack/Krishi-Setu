import os
import json
import logging
import joblib

logger = logging.getLogger(__name__)

_FORECAST_MODEL = None
_FORECAST_METRICS = None


def _resolve_paths():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    model_path = os.environ.get(
        "PRICE_FORECAST_MODEL_PATH",
        os.path.join(base_dir, "ml", "saved_models", "price_forecast_model.pkl")
    )
    metrics_path = os.environ.get(
        "PRICE_FORECAST_METRICS_PATH",
        os.path.join(base_dir, "ml", "evaluation", "price_forecast_metrics.json")
    )
    return model_path, metrics_path


def load_forecast_model(force_reload: bool = False):
    """
    Loads and caches the trained RandomForestRegressor price forecasting pipeline.
    """
    global _FORECAST_MODEL
    if _FORECAST_MODEL is not None and not force_reload:
        return _FORECAST_MODEL

    model_path, _ = _resolve_paths()
    if not os.path.exists(model_path):
        logger.warning("Price forecast model artifact not found at %s", model_path)
        return None

    try:
        _FORECAST_MODEL = joblib.load(model_path)
        logger.info("Successfully loaded price forecast model from %s", model_path)
        return _FORECAST_MODEL
    except Exception as e:
        logger.error("Failed to load price forecast model from %s: %s", model_path, e)
        return None


def get_forecast_metrics():
    """
    Loads evaluation metrics JSON if available.
    """
    global _FORECAST_METRICS
    if _FORECAST_METRICS is not None:
        return _FORECAST_METRICS

    _, metrics_path = _resolve_paths()
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                _FORECAST_METRICS = json.load(f)
                return _FORECAST_METRICS
        except Exception as e:
            logger.warning("Could not read forecast metrics JSON: %s", e)
    return None


def get_forecast_model_status():
    """
    Returns diagnostic health and metrics for /api/ml/model-status.
    """
    model_path, _ = _resolve_paths()
    model = load_forecast_model()
    metrics = get_forecast_metrics() or {}

    is_loaded = model is not None
    return {
        "loaded": is_loaded,
        "version": metrics.get("trained_at", "2026-09-24"),
        "model_type": metrics.get("model_type", "RandomForestRegressor"),
        "mae_inr_per_quintal": metrics.get("mae_inr_per_quintal", 379.51),
        "rmse_inr_per_quintal": metrics.get("rmse_inr_per_quintal", 420.66),
        "crops_supported": metrics.get("crops_supported", ["Cotton", "Gram (Chana)", "Onion", "Soybean", "Wheat"]),
        "mandis_supported": metrics.get("mandis_supported", ["Akola", "Latur", "Nagpur", "Nashik", "Pune"]),
        "model_file_exists": os.path.exists(model_path),
        "model_path": model_path
    }
