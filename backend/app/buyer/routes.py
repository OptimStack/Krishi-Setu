from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId

from app.utils.decorators import role_required
from app.utils.validators import validate_required_fields, validate_positive_number, validate_enum
from app.utils.serializers import serialize_doc, serialize_docs
from app.models.bid import Bid
from app.models.pooled_batch import PooledBatch
from app.models.user import User

buyer_bp = Blueprint('buyer', __name__)


@buyer_bp.route('/bids', methods=['GET'])
@jwt_required()
@role_required('buyer')
def get_bids():
    """Retrieve all bids placed by the authenticated buyer."""
    buyer_id = get_jwt_identity()
    status_filter = request.args.get('status')
    bids = Bid.find_by_buyer(buyer_id, status=status_filter)
    return jsonify({"data": serialize_docs(bids), "error": None}), 200


@buyer_bp.route('/bids/<bid_id>', methods=['GET'])
@jwt_required()
@role_required('buyer')
def get_bid_detail(bid_id):
    """Retrieve a single bid detail for the authenticated buyer."""
    buyer_id = get_jwt_identity()
    bid = Bid.find_by_id(bid_id)

    if not bid:
        return jsonify({"data": None, "error": {"code": "NOT_FOUND", "message": "Bid not found"}}), 404

    if str(bid.get('buyer_id')) != str(buyer_id):
        return jsonify({"data": None, "error": {"code": "FORBIDDEN", "message": "Access denied"}}), 403

    return jsonify({"data": serialize_doc(bid), "error": None}), 200


@buyer_bp.route('/bids', methods=['POST'])
@jwt_required()
@role_required('buyer')
def create_bid():
    """Submit a new buying bid."""
    buyer_id = get_jwt_identity()
    raw_data = request.get_json(silent=True) or {}

    # Crop / commodity validation
    crop = (raw_data.get('crop') or raw_data.get('commodity') or '').strip()
    if not crop:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": "Crop / commodity name is required"}
        }), 400

    # Quantity validation
    raw_qty = raw_data.get('quantity_needed_kg')
    if raw_qty is None:
        raw_qty = raw_data.get('quantity')
    valid_qty, qty_val = validate_positive_number(raw_qty, 'quantity_needed_kg')
    if not valid_qty:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": qty_val}
        }), 400

    # Max price validation
    raw_price = raw_data.get('max_price_per_kg')
    if raw_price is None:
        raw_price = raw_data.get('price')
    if raw_price is None:
        raw_price = raw_data.get('bidAmount')
    valid_price, price_val = validate_positive_number(raw_price, 'max_price_per_kg')
    if not valid_price:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": price_val}
        }), 400

    # Minimum quality grade validation
    grade = (raw_data.get('min_quality_grade') or raw_data.get('grade') or 'C').strip().upper()
    valid_grade, grade_val = validate_enum(grade, ['A', 'B', 'C'], 'min_quality_grade')
    if not valid_grade:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": grade_val}
        }), 400

    # Optional batch validation
    batch_id = raw_data.get('batch_id') or raw_data.get('batchId') or raw_data.get('pooled_batch_id')
    if batch_id:
        batch = PooledBatch.find_by_id(batch_id)
        if not batch:
            return jsonify({
                "data": None,
                "error": {"code": "NOT_FOUND", "message": "Referenced pooled batch not found"}
            }), 404

    bid_data = {
        'buyer_id': buyer_id,
        'crop': crop,
        'quantity_needed_kg': qty_val,
        'quantity_remaining_kg': qty_val,
        'max_price_per_kg': price_val,
        'min_quality_grade': grade_val,
    }
    if batch_id:
        bid_data['batch_id'] = str(batch_id)

    created = Bid.create(bid_data)
    return jsonify({
        "data": {
            "bid": serialize_doc(created),
            "id": str(created['_id'])
        },
        "error": None
    }), 201


@buyer_bp.route('/bids/<bid_id>/cancel', methods=['POST'])
@jwt_required()
@role_required('buyer')
def cancel_bid(bid_id):
    """Cancel an open bid."""
    buyer_id = get_jwt_identity()
    bid = Bid.find_by_id(bid_id)

    if not bid:
        return jsonify({"data": None, "error": {"code": "NOT_FOUND", "message": "Bid not found"}}), 404

    if str(bid.get('buyer_id')) != str(buyer_id):
        return jsonify({"data": None, "error": {"code": "FORBIDDEN", "message": "Access denied"}}), 403

    if bid.get('status') != 'open':
        return jsonify({
            "data": None,
            "error": {"code": "INVALID_STATE", "message": f"Cannot cancel bid with status '{bid.get('status')}'"}
        }), 400

    updated = Bid.update_status(bid_id, 'cancelled')
    return jsonify({"data": serialize_doc(updated), "error": None}), 200


def _get_enriched_batches():
    crop_filter = request.args.get('crop')
    grade_filter = request.args.get('quality_grade') or request.args.get('grade')
    batches = PooledBatch.find_open(crop=crop_filter, quality_grade=grade_filter)

    enriched = []
    for b in batches:
        b_dict = dict(b)
        b_id = str(b['_id'])
        b_dict['id'] = b_id
        b_dict['commodity'] = b.get('crop', '')
        b_dict['grade'] = b.get('quality_grade', '')
        b_dict['quantity'] = float(b.get('total_quantity_kg', 0))
        b_dict['total_quantity_quintals'] = round(float(b.get('total_quantity_kg', 0)) / 100, 2)
        b_dict['listing_count'] = len(b.get('listing_ids', []))

        # Check highest active bid for this crop
        open_bids = Bid.find_open(crop=b.get('crop'))
        highest_bid = open_bids[0]['max_price_per_kg'] if open_bids else None
        b_dict['current_highest_bid'] = highest_bid
        b_dict['currentBid'] = highest_bid or 0.0
        enriched.append(b_dict)

    return jsonify({"data": serialize_docs(enriched), "error": None}), 200


@buyer_bp.route('/batches', methods=['GET'])
@jwt_required()
@role_required('buyer')
def get_batches():
    """Browse open pooled batches available for bidding."""
    return _get_enriched_batches()


@buyer_bp.route('/browse-batches', methods=['GET'])
@jwt_required()
@role_required('buyer')
def browse_batches():
    """Alias for /batches to support all client conventions."""
    return _get_enriched_batches()


@buyer_bp.route('/batches/<batch_id>', methods=['GET'])
@jwt_required()
@role_required('buyer')
def get_batch_detail(batch_id):
    """Retrieve details of a single pooled batch."""
    batch = PooledBatch.find_by_id(batch_id)
    if not batch:
        return jsonify({"data": None, "error": {"code": "NOT_FOUND", "message": "Pooled batch not found"}}), 404

    b_dict = dict(batch)
    b_dict['id'] = str(b_dict['_id'])
    b_dict['commodity'] = b_dict.get('crop', '')
    b_dict['grade'] = b_dict.get('quality_grade', '')
    b_dict['quantity'] = float(b_dict.get('total_quantity_kg', 0))
    b_dict['total_quantity_quintals'] = round(float(b_dict.get('total_quantity_kg', 0)) / 100, 2)
    b_dict['listing_count'] = len(b_dict.get('listing_ids', []))

    open_bids = Bid.find_open(crop=b_dict.get('crop'))
    highest_bid = open_bids[0]['max_price_per_kg'] if open_bids else None
    b_dict['current_highest_bid'] = highest_bid
    b_dict['currentBid'] = highest_bid or 0.0

    return jsonify({"data": serialize_doc(b_dict), "error": None}), 200


@buyer_bp.route('/trades', methods=['GET'])
@jwt_required()
@role_required('buyer')
def get_buyer_trades():
    """Retrieve all double-auction trades executed for this buyer."""
    from app.models.trade import Trade
    buyer_id = get_jwt_identity()
    trades = Trade.find_by_buyer(buyer_id)
    return jsonify({"data": serialize_docs(trades), "error": None}), 200

