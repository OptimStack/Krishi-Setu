from flask import Blueprint, jsonify, request
from app.models.market_price import MarketPrice
from app.market_data.ingest import ingest_from_sources
from app.utils.serializers import serialize_docs

market_bp = Blueprint('market', __name__)


@market_bp.route('/prices', methods=['GET'])
def get_prices():
    """
    Retrieve historical mandi prices with optional crop and mandi filters.
    """
    crop = request.args.get('crop')
    mandi = request.args.get('mandi') or request.args.get('mandi_name')
    limit = request.args.get('limit', default=50, type=int)

    if crop:
        prices = MarketPrice.find_latest(crop=crop, mandi_name=mandi, limit=limit)
    else:
        # Return recent prices across all crops
        from app import extensions
        prices = list(extensions.db.market_prices.find().sort('date', -1).limit(limit))

    return jsonify({
        "data": {
            "count": len(prices),
            "prices": serialize_docs(prices)
        },
        "error": None
    }), 200


@market_bp.route('/crops', methods=['GET'])
def get_crops():
    """
    Retrieve distinct agricultural commodities with market price data.
    """
    crops = MarketPrice.get_distinct_crops()
    if not crops:
        crops = ["Onion", "Tomato", "Soybean", "Wheat", "Cotton", "Gram (Chana)"]
    return jsonify({"data": crops, "error": None}), 200


@market_bp.route('/mandis', methods=['GET'])
def get_mandis():
    """
    Retrieve distinct mandis / APMC market centers.
    """
    crop = request.args.get('crop')
    mandis = MarketPrice.get_distinct_mandis(crop=crop)
    if not mandis:
        mandis = ["Nashik", "Pune", "Latur", "Akola", "Nagpur"]
    return jsonify({"data": mandis, "error": None}), 200


@market_bp.route('/ingest', methods=['POST'])
def trigger_ingest():
    """
    Trigger ingestion and reconciliation of market prices across eNAM, Agmarknet, data.gov.in.
    """
    days = request.args.get('days', default=30, type=int)
    result = ingest_from_sources(days=days)
    return jsonify({
        "data": result,
        "error": None
    }), 200
