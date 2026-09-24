import os
import io
import logging
from flask import Blueprint, jsonify, request, current_app
from werkzeug.utils import secure_filename

from app.grading.model_loader import get_model_status as get_grading_status
from app.grading.infer import infer_grade
from app.price_forecast.model_loader import get_forecast_model_status
from app.price_forecast.predict import predict_price as run_price_forecast

logger = logging.getLogger(__name__)

ml_bp = Blueprint('ml', __name__)

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


@ml_bp.route('/model-status', methods=['GET'])
def model_status():
    """
    Returns diagnostic health and loaded state of all ML models.
    Fulfills masterplan Section 6.2.
    """
    try:
        grading_status = get_grading_status()
    except Exception as e:
        logger.error("Error reading grading model status: %s", e)
        grading_status = {
            "loaded": False,
            "error": str(e)
        }

    try:
        price_forecast_status = get_forecast_model_status()
    except Exception as e:
        logger.error("Error reading price forecast status: %s", e)
        price_forecast_status = {
            "loaded": False,
            "error": str(e)
        }

    return jsonify({
        "data": {
            "grading_model": grading_status,
            "price_forecast_model": price_forecast_status
        },
        "error": None
    }), 200


@ml_bp.route('/grade-produce', methods=['POST'])
def grade_produce():
    """
    Isolated testing endpoint for visual produce quality grading.
    Accepts multipart/form-data with 'photo' or 'image' file.
    Fulfills masterplan Section 6.4.
    """
    photo_file = request.files.get('photo') or request.files.get('image')
    crop_type = request.form.get('crop') or request.form.get('crop_type') or request.args.get('crop')

    if not photo_file or not photo_file.filename:
        json_data = request.get_json(silent=True) or {}
        if not json_data.get('image'):
            return jsonify({
                "data": None,
                "error": {
                    "code": "MISSING_IMAGE",
                    "message": "Produce photo file ('photo' or 'image') is required"
                }
            }), 400

    if photo_file:
        if not _allowed_file(photo_file.filename):
            return jsonify({
                "data": None,
                "error": {
                    "code": "INVALID_IMAGE_FORMAT",
                    "message": f"Supported formats: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
                }
            }), 400

        try:
            image_bytes = photo_file.read()
            inference_result = infer_grade(image_bytes, crop_type=crop_type)
            return jsonify({
                "data": inference_result,
                "error": None
            }), 200
        except Exception as e:
            logger.error("Grade produce endpoint error: %s", e)
            return jsonify({
                "data": {
                    "predicted_grade": "B",
                    "confidence": 0.50,
                    "needs_human_review": True,
                    "fallback_used": True,
                    "message": "Fallback applied due to image processing anomaly."
                },
                "error": None
            }), 200

    return jsonify({
        "data": None,
        "error": {"code": "BAD_REQUEST", "message": "Invalid request payload"}
    }), 400


@ml_bp.route('/predict-price', methods=['GET', 'POST'])
def predict_price_route():
    """
    Price forecast endpoint per masterplan Section 6.3.
    Input: { crop, mandi_name, date } (via POST body or GET query params).
    Output: { predicted_price_per_quintal, confidence_interval, fallback_used: bool, ... }
    """
    if request.method == 'POST':
        payload = request.get_json(silent=True) or {}
    else:
        payload = {}

    crop = payload.get('crop') or request.args.get('crop') or 'Onion'
    mandi = payload.get('mandi_name') or request.args.get('mandi') or request.args.get('mandi_name') or 'Nashik'
    date_val = payload.get('date') or request.args.get('date')
    force_fallback = bool(payload.get('force_fallback') or request.args.get('force_fallback') == 'true')

    try:
        result = run_price_forecast(
            crop=crop,
            mandi_name=mandi,
            target_date=date_val,
            force_fallback=force_fallback
        )
        return jsonify({
            "data": result,
            "error": None
        }), 200
    except Exception as e:
        logger.error("Price prediction exception: %s", e)
        # Section 10 Edge Case 5: Never return a raw 500 error to the frontend
        return jsonify({
            "data": {
                "crop": crop,
                "mandi_name": mandi,
                "predicted_price_per_quintal": 2200.0,
                "predicted_price_per_kg": 22.0,
                "confidence_interval": [2050.0, 2350.0],
                "trend": "stable",
                "recommendation": "Estimate based on regional baseline (service anomaly)",
                "confidence": 70,
                "fallback_used": True,
                "fallback_reason": str(e)
            },
            "error": None
        }), 200
