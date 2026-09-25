from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId

from app.utils.decorators import role_required
from app.utils.validators import validate_required_fields, validate_positive_number, validate_enum
from app.utils.serializers import serialize_doc, serialize_docs
from app.models.bid import Bid
from app.models.pooled_batch import PooledBatch
from app.models.produce_listing import ProduceListing
from app.models.user import User
from app.extensions import db

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


@buyer_bp.route('/available-produce', methods=['GET'])
@jwt_required()
@role_required('buyer')
def get_available_produce():
    """Retrieve all open farmer produce listings directly available for procurement."""
    crop = request.args.get('crop')
    grade = request.args.get('quality_grade')
    listings = ProduceListing.find_open(crop=crop, quality_grade=grade)

    enriched = []
    for l in listings:
        ld = dict(l)
        farmer = User.find_by_id(ld.get('farmer_id')) if ld.get('farmer_id') else None
        ld['farmer_name'] = farmer.get('name') if farmer else 'Farmer'
        enriched.append(ld)

    return jsonify({"data": serialize_docs(enriched), "error": None}), 200


@buyer_bp.route('/batches/<batch_id>/buy-direct', methods=['POST'])
@jwt_required()
@role_required('buyer')
def buy_batch_direct(batch_id):
    """Direct instant purchase of a pooled batch or single farmer listing at ask price."""
    buyer_id = get_jwt_identity()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Check if it is a pooled batch
    batch = PooledBatch.find_by_id(batch_id)
    if batch:
        qty = float(batch.get('total_quantity_kg', 0))
        price = float(batch.get('weighted_ask_price_per_kg') or batch.get('min_clearing_price_per_kg') or 25.0)
        total_amount = qty * price

        trade_doc = {
            'crop': batch.get('crop'),
            'quality_grade': batch.get('quality_grade', 'A'),
            'quantity_kg': qty,
            'clearing_price_per_kg': price,
            'total_amount': total_amount,
            'buyer_id': ObjectId(buyer_id) if ObjectId.is_valid(buyer_id) else buyer_id,
            'status': 'settled',
            'settled_at': now_iso,
            'created_at': now_iso,
            'farmer_shares': []
        }

        for lid in batch.get('listing_ids', []):
            ProduceListing.update_status(lid, 'settled')
            l_doc = ProduceListing.find_by_id(lid)
            if l_doc:
                l_qty = float(l_doc.get('quantity_kg', 0))
                trade_doc['farmer_shares'].append({
                    'farmer_id': l_doc.get('farmer_id'),
                    'quantity_kg': l_qty,
                    'payout_amount': l_qty * price,
                    'status': 'settled'
                })

        PooledBatch.update_status(batch_id, 'settled')
        t_res = db.trades.insert_one(trade_doc)
        trade_doc['_id'] = t_res.inserted_id
        return jsonify({"data": {"trade": serialize_doc(trade_doc), "message": "Batch purchased and settled!"}, "error": None}), 200

    # 2. Check if it is a direct ProduceListing ID
    listing = ProduceListing.find_by_id(batch_id)
    if listing:
        qty = float(listing.get('quantity_remaining_kg') or listing.get('quantity_kg', 0))
        price = float(listing.get('ask_price_per_kg', 25.0))
        total_amount = qty * price

        trade_doc = {
            'crop': listing.get('crop'),
            'quality_grade': listing.get('quality_grade', 'A'),
            'quantity_kg': qty,
            'clearing_price_per_kg': price,
            'total_amount': total_amount,
            'buyer_id': ObjectId(buyer_id) if ObjectId.is_valid(buyer_id) else buyer_id,
            'status': 'settled',
            'settled_at': now_iso,
            'created_at': now_iso,
            'farmer_shares': [
                {
                    'farmer_id': listing.get('farmer_id'),
                    'quantity_kg': qty,
                    'payout_amount': total_amount,
                    'status': 'settled'
                }
            ]
        }
        ProduceListing.update_status(batch_id, 'settled')
        t_res = db.trades.insert_one(trade_doc)
        trade_doc['_id'] = t_res.inserted_id
        return jsonify({"data": {"trade": serialize_doc(trade_doc), "message": "Produce purchased and settled!"}, "error": None}), 200

    return jsonify({"data": None, "error": {"code": "NOT_FOUND", "message": "Batch or Produce Lot not found"}}), 404


@buyer_bp.route('/active-pool', methods=['GET'])
def get_active_pool():
    """Retrieve current FPO active aggregation pool progress."""
    active_pool = db.active_pools.find_one({"status": "open"})
    if not active_pool:
        active_pool = {
            "_id": "batch_fpo_pune",
            "id": "batch_fpo_pune",
            "name": "Pune FPO Hub — Pune Gultekdi Market",
            "crop": "Tomato",
            "variety": "Abhinav (Hybrid)",
            "quality_grade": "Grade A",
            "current_quantity_kg": 750.0,
            "target_quantity_kg": 1200.0,
            "price_per_kg": 16.55,
            "status": "open",
            "location": "Baramati Cluster / Pune Gultekdi",
            "farmers_count": 4,
        }
    return jsonify({"data": serialize_doc(active_pool), "error": None}), 200


@buyer_bp.route('/buy-pool-stock', methods=['POST'])
@jwt_required()
@role_required('buyer')
def buy_pool_stock():
    """Buy stock directly from active FPO aggregation pool, reducing pool progress."""
    buyer_id = get_jwt_identity()
    raw_data = request.get_json() or {}
    now_iso = datetime.now(timezone.utc).isoformat()

    active_pool = db.active_pools.find_one({"status": "open"})
    if not active_pool:
        active_pool = {
            "_id": "batch_fpo_pune",
            "name": "Pune FPO Hub — Pune Gultekdi Market",
            "crop": "Tomato",
            "quality_grade": "Grade A",
            "current_quantity_kg": 750.0,
            "target_quantity_kg": 1200.0,
            "price_per_kg": 16.55,
            "status": "open"
        }

    current_qty = float(active_pool.get("current_quantity_kg", 750.0))
    requested_qty = float(raw_data.get("quantity_kg", 250.0))
    qty_to_buy = min(current_qty, requested_qty)

    if qty_to_buy <= 0:
        return jsonify({"data": None, "error": {"code": "OUT_OF_STOCK", "message": "No stock remaining in this pool"}}), 400

    price = float(raw_data.get("price_per_kg") or active_pool.get("price_per_kg", 16.55))
    total_amount = qty_to_buy * price
    new_qty = max(0.0, current_qty - qty_to_buy)

    new_status = "settled" if new_qty <= 0 else "open"
    db.active_pools.update_one(
        {"_id": active_pool["_id"]},
        {"$set": {"current_quantity_kg": new_qty, "status": new_status, "updated_at": now_iso}},
        upsert=True
    )
    active_pool["current_quantity_kg"] = new_qty
    active_pool["status"] = new_status

    trade_doc = {
        "crop": active_pool.get("crop", "Tomato"),
        "quality_grade": active_pool.get("quality_grade", "Grade A"),
        "quantity_kg": qty_to_buy,
        "clearing_price_per_kg": price,
        "total_amount": total_amount,
        "buyer_id": ObjectId(buyer_id) if ObjectId.is_valid(buyer_id) else buyer_id,
        "status": "settled",
        "settled_at": now_iso,
        "created_at": now_iso,
        "farmer_shares": [
            {
                "farmer_id": "usr_farmer_1",
                "farmer_name": "Ramesh Patil & FPO Members",
                "quantity_kg": qty_to_buy,
                "payout_amount": total_amount,
                "status": "settled"
            }
        ]
    }
    t_res = db.trades.insert_one(trade_doc)
    trade_doc["_id"] = t_res.inserted_id

    return jsonify({
        "data": {
            "success": True,
            "pool": serialize_doc(active_pool),
            "trade": serialize_doc(trade_doc),
            "message": f"Successfully purchased {qty_to_buy} kg from active pool!"
        },
        "error": None
    }), 200


