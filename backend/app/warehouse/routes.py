import logging
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.warehouse import Warehouse
from app.models.user import User
from app.warehouse.seed_data import ensure_warehouses_seeded
from app.utils.serializers import serialize_doc, serialize_docs

logger = logging.getLogger(__name__)

warehouse_bp = Blueprint('warehouse', __name__)

DEFAULT_NASHIK_LAT = 19.9975
DEFAULT_NASHIK_LNG = 73.7898


@warehouse_bp.route('/nearby', methods=['GET'])
def get_nearby_warehouses():
    """
    Geo-search nearby agricultural storage facilities (warehouses, silos, cold storages)
    sorted by distance ascending. Fulfills masterplan Section 8 Milestone 10.
    """
    # Ensure baseline storage facilities are seeded
    ensure_warehouses_seeded()

    # Determine coordinates
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)

    if lat is None or lng is None:
        lat = DEFAULT_NASHIK_LAT
        lng = DEFAULT_NASHIK_LNG

    crop = request.args.get('crop')
    warehouse_type = request.args.get('type')
    max_dist_km = request.args.get('max_distance_km', default=150.0, type=float)
    limit = request.args.get('limit', default=20, type=int)

    nearby = Warehouse.find_nearby(
        lng=lng,
        lat=lat,
        max_distance_km=max_dist_km,
        crop=crop,
        warehouse_type=warehouse_type,
        limit=limit
    )

    return jsonify({
        "data": {
            "origin": {"lat": lat, "lng": lng},
            "count": len(nearby),
            "crop_filter": crop,
            "type_filter": warehouse_type,
            "warehouses": serialize_docs(nearby)
        },
        "error": None
    }), 200


@warehouse_bp.route('/<warehouse_id>', methods=['GET'])
def get_warehouse_detail(warehouse_id):
    """Retrieve details for a specific warehouse."""
    warehouse = Warehouse.find_by_id(warehouse_id)
    if not warehouse:
        return jsonify({
            "data": None,
            "error": {"code": "NOT_FOUND", "message": "Warehouse not found"}
        }), 404

    return jsonify({
        "data": serialize_doc(warehouse),
        "error": None
    }), 200


@warehouse_bp.route('/seed', methods=['POST'])
def trigger_seed():
    """Seed or verify agricultural storage facilities."""
    count = ensure_warehouses_seeded()
    return jsonify({
        "data": {"seeded_count": count},
        "error": None
    }), 200
