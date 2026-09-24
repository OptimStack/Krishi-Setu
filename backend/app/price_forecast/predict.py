import logging
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from app.price_forecast.model_loader import load_forecast_model, get_forecast_metrics
from app.models.market_price import MarketPrice

logger = logging.getLogger(__name__)

# Baseline price fallbacks for common crops (₹ / quintal)
BASELINE_CROP_PRICES = {
    "Soybean": 4300.0,
    "Wheat": 2450.0,
    "Cotton": 6850.0,
    "Onion": 1850.0,
    "Tomato": 2200.0,
    "Gram (Chana)": 5200.0,
    "Maize": 2100.0,
    "Pomegranate": 8500.0,
}


def predict_price(crop: str, mandi_name: str = "Nashik", target_date: str = None, force_fallback: bool = False) -> dict:
    """
    Predicts mandi modal price per quintal and per kg for a given crop and mandi.
    If the crop/mandi is supported by the trained ML pipeline, runs inference.
    Otherwise, gracefully falls back to recent moving-average (Section 10 Edge Case 5).
    """
    clean_crop = (crop or "Onion").strip()
    clean_mandi = (mandi_name or "Nashik").strip()

    if not target_date:
        forecast_dt = datetime.now() + timedelta(days=7)
    else:
        try:
            forecast_dt = datetime.fromisoformat(str(target_date).replace("Z", ""))
        except Exception:
            forecast_dt = datetime.now() + timedelta(days=7)

    date_str = forecast_dt.strftime("%Y-%m-%d")
    model = None if force_fallback else load_forecast_model()
    metrics = get_forecast_metrics() or {}
    crops_supported = metrics.get("crops_supported", [])
    mandis_supported = metrics.get("mandis_supported", [])
    mae = metrics.get("mae_inr_per_quintal", 379.51)

    # 1. Check if model can serve this crop & mandi directly
    can_use_model = (
        model is not None
        and clean_crop in crops_supported
        and clean_mandi in mandis_supported
    )

    if can_use_model:
        try:
            # Query recent price history for lag & rolling features
            recent_prices = MarketPrice.find_latest(clean_crop, clean_mandi, limit=14)
            if recent_prices:
                modal_values = [p["modal_price_per_quintal"] for p in recent_prices]
                lag_1 = modal_values[0]
                lag_7 = modal_values[min(6, len(modal_values) - 1)]
                roll_mean = float(np.mean(modal_values[:7]))
                roll_std = float(np.std(modal_values[:7])) if len(modal_values) > 1 else 50.0
                current_price = lag_1
            else:
                # Default baseline price for trained crop
                base = BASELINE_CROP_PRICES.get(clean_crop, 2500.0)
                lag_1 = base
                lag_7 = base
                roll_mean = base
                roll_std = 60.0
                current_price = base

            feature_dict = {
                "crop": [clean_crop],
                "mandi_name": [clean_mandi],
                "month": [forecast_dt.month],
                "day_of_week": [forecast_dt.weekday()],
                "day_of_year": [forecast_dt.timetuple().tm_yday],
                "arrivals_tonnes": [250.0],
                "price_lag_1": [lag_1],
                "price_lag_7": [lag_7],
                "price_rolling_7_mean": [roll_mean],
                "price_rolling_7_std": [roll_std],
            }
            feature_df = pd.DataFrame(feature_dict)

            predicted_modal = float(model.predict(feature_df)[0])
            predicted_modal = max(300.0, round(predicted_modal, 2))

            # Confidence interval based on model MAE
            ci_lower = max(200.0, round(predicted_modal - mae, 2))
            ci_upper = round(predicted_modal + mae, 2)

            price_change = round(((predicted_modal - current_price) / max(1.0, current_price)) * 100, 2)
            if price_change >= 2.0:
                trend = "up"
                recommendation = "Hold / Sell Next Week"
            elif price_change <= -2.0:
                trend = "down"
                recommendation = "Sell in Current Window"
            else:
                trend = "stable"
                recommendation = "Stable Market Price"

            return {
                "crop": clean_crop,
                "mandi_name": clean_mandi,
                "forecast_date": date_str,
                "current_price_per_quintal": round(current_price, 2),
                "current_price_per_kg": round(current_price / 100, 2),
                "predicted_price_per_quintal": predicted_modal,
                "predicted_price_per_kg": round(predicted_modal / 100, 2),
                "price_change_percent": price_change,
                "confidence_interval": [ci_lower, ci_upper],
                "trend": trend,
                "recommendation": recommendation,
                "confidence": 85,
                "fallback_used": False,
                "valid_until": (forecast_dt + timedelta(days=7)).strftime("%Y-%m-%d"),
            }
        except Exception as e:
            logger.error("Error during price model inference: %s. Falling back to moving average.", e)

    # 2. Section 10 Edge Case 5: Moving-Average Fallback Path
    moving_avg = MarketPrice.get_recent_moving_average(clean_crop, clean_mandi, days=7)
    if moving_avg is None:
        # Fall back to base heuristic
        moving_avg = BASELINE_CROP_PRICES.get(clean_crop, 2200.0)
        fallback_msg = "Estimate based on regional baseline (sparse/no historical market data for this crop)"
    else:
        fallback_msg = "Estimate based on 7-day moving average, not the trained model"

    current_price = moving_avg
    # Small seasonal drift for 7-day projection
    predicted_modal = round(moving_avg * 1.015, 2)
    ci_lower = round(predicted_modal * 0.94, 2)
    ci_upper = round(predicted_modal * 1.06, 2)

    return {
        "crop": clean_crop,
        "mandi_name": clean_mandi,
        "forecast_date": date_str,
        "current_price_per_quintal": round(current_price, 2),
        "current_price_per_kg": round(current_price / 100, 2),
        "predicted_price_per_quintal": predicted_modal,
        "predicted_price_per_kg": round(predicted_modal / 100, 2),
        "price_change_percent": 1.5,
        "confidence_interval": [ci_lower, ci_upper],
        "trend": "stable",
        "recommendation": "Estimate based on recent average",
        "confidence": 72,
        "fallback_used": True,
        "fallback_reason": fallback_msg,
        "valid_until": (forecast_dt + timedelta(days=7)).strftime("%Y-%m-%d"),
    }
