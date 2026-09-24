import os
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from bson import ObjectId

from app.utils.decorators import role_required
from app.utils.validators import validate_required_fields, validate_positive_number, validate_enum
from app.utils.serializers import serialize_doc, serialize_docs
from app.models.produce_listing import ProduceListing
from app.models.user import User
from app.models.trade import Trade

farmer_bp = Blueprint('farmer', __name__)

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


@farmer_bp.route('/listings', methods=['GET'])
@jwt_required()
@role_required('farmer')
def get_listings():
    """Retrieve all produce listings for the authenticated farmer."""
    farmer_id = get_jwt_identity()
    status_filter = request.args.get('status')
    
    listings = ProduceListing.find_by_farmer(farmer_id, status=status_filter)
    return jsonify({"data": serialize_docs(listings), "error": None}), 200


@farmer_bp.route('/listings/<listing_id>', methods=['GET'])
@jwt_required()
@role_required('farmer')
def get_listing_detail(listing_id):
    """Retrieve a single produce listing detail."""
    farmer_id = get_jwt_identity()
    try:
        listing = ProduceListing.find_by_id(listing_id)
    except Exception:
        return jsonify({"data": None, "error": {"code": "INVALID_ID", "message": "Invalid listing ID"}}), 400

    if not listing:
        return jsonify({"data": None, "error": {"code": "NOT_FOUND", "message": "Listing not found"}}), 404

    if str(listing.get('farmer_id')) != str(farmer_id):
        return jsonify({"data": None, "error": {"code": "FORBIDDEN", "message": "Access denied"}}), 403

    return jsonify({"data": serialize_doc(listing), "error": None}), 200


@farmer_bp.route('/listings', methods=['POST'])
@jwt_required()
@role_required('farmer')
def create_listing():
    """Submit a new produce listing (supports JSON and multipart/form-data with photo upload)."""
    farmer_id = get_jwt_identity()
    
    # Handle multipart/form-data or application/json
    file_path = None
    image_url = None
    if request.files or request.form:
        raw_data = request.form.to_dict()
        photo_file = request.files.get('photo') or request.files.get('image')
        if photo_file and photo_file.filename:
            if not _allowed_file(photo_file.filename):
                return jsonify({
                    "data": None,
                    "error": {"code": "INVALID_FILE", "message": "Allowed image formats: png, jpg, jpeg, webp"}
                }), 400
            
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            
            ext = photo_file.filename.rsplit('.', 1)[1].lower()
            filename = f"crop_{uuid.uuid4().hex[:12]}_{int(datetime.now(timezone.utc).timestamp())}.{ext}"
            file_path = os.path.join(upload_folder, filename)
            photo_file.save(file_path)
            image_url = f"/uploads/{filename}"
    else:
        raw_data = request.get_json(silent=True) or {}

    # Required fields validation
    crop = (raw_data.get('crop') or raw_data.get('commodity') or '').strip()
    if not crop:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": "Crop / commodity name is required"}
        }), 400

    # Quantity validation
    valid_qty, qty_val = validate_positive_number(raw_data.get('quantity_kg') or raw_data.get('quantity'), 'quantity_kg')
    if not valid_qty:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": qty_val}
        }), 400

    # Ask price validation
    raw_ask_price = raw_data.get('ask_price_per_kg') or raw_data.get('minPrice') or raw_data.get('price')
    valid_ask, ask_val = validate_positive_number(raw_ask_price, 'ask_price_per_kg')
    if not valid_ask:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": ask_val}
        }), 400

    # Minimum acceptable price validation
    raw_min_price = raw_data.get('min_acceptable_price_per_kg')
    if raw_min_price:
        valid_min, min_val = validate_positive_number(raw_min_price, 'min_acceptable_price_per_kg')
        if not valid_min:
            return jsonify({
                "data": None,
                "error": {"code": "VALIDATION", "message": min_val}
            }), 400
        if min_val > ask_val:
            return jsonify({
                "data": None,
                "error": {"code": "VALIDATION", "message": "min_acceptable_price_per_kg cannot exceed ask_price_per_kg"}
            }), 400
    else:
        min_val = ask_val

    # Quality grade validation
    grade = (raw_data.get('quality_grade') or 'ungraded').strip()
    valid_grade, grade_val = validate_enum(grade, ['A', 'B', 'C', 'ungraded'], 'quality_grade')
    if not valid_grade:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": grade_val}
        }), 400

    # AI Quality Grading (Milestone 7)
    grading_info = None
    if file_path and os.path.exists(file_path):
        try:
            from app.grading.infer import infer_grade
            grade_result = infer_grade(file_path, crop_type=crop)
            grading_info = grade_result
            if grade_val == 'ungraded':
                if not grade_result.get('needs_human_review', False):
                    # High confidence: auto-fill quality_grade
                    grade_val = grade_result.get('predicted_grade', 'ungraded')
                else:
                    # Low confidence: remain ungraded until admin review
                    grade_val = 'ungraded'
        except Exception as e:
            current_app.logger.warning("AI grading inference failed on upload: %s", e)

    # Fetch farmer's location for default listing location
    farmer_user = User.find_by_id(farmer_id)
    default_location = farmer_user.get('location', {}) if farmer_user else {}
    listing_location = raw_data.get('location') or default_location

    doc_data = {
        'farmer_id': farmer_id,
        'crop': crop,
        'variety': (raw_data.get('variety') or '').strip(),
        'quantity_kg': qty_val,
        'ask_price_per_kg': ask_val,
        'min_acceptable_price_per_kg': min_val,
        'quality_grade': grade_val,
        'harvest_date': raw_data.get('harvest_date'),
        'location': listing_location,
        'image_url': image_url or raw_data.get('image_url'),
    }

    created = ProduceListing.create(doc_data)
    listing_id = created['_id']

    # Record grading record and link to listing
    if grading_info:
        try:
            from app.models.grading_record import GradingRecord
            record_doc = GradingRecord.create({
                'listing_id': listing_id,
                'image_url': image_url,
                'predicted_grade': grading_info.get('predicted_grade', 'B'),
                'confidence': grading_info.get('confidence', 0.0),
                'needs_human_review': grading_info.get('needs_human_review', False),
            })
            ProduceListing.update(listing_id, {'grading_record_id': record_doc['_id']})
            created['grading_record_id'] = record_doc['_id']
            created['quality_grade'] = grade_val
            grading_info['record_id'] = str(record_doc['_id'])
        except Exception as e:
            current_app.logger.error("Failed to persist grading record: %s", e)

    resp_data = {
        "listing": serialize_doc(created),
        "id": str(created['_id'])
    }
    if grading_info:
        resp_data["grading"] = grading_info

    return jsonify({
        "data": resp_data,
        "error": None
    }), 201


@farmer_bp.route('/listings/<listing_id>/cancel', methods=['POST'])
@jwt_required()
@role_required('farmer')
def cancel_listing(listing_id):
    """Cancel an open listing."""
    farmer_id = get_jwt_identity()
    try:
        listing = ProduceListing.find_by_id(listing_id)
    except Exception:
        return jsonify({"data": None, "error": {"code": "INVALID_ID", "message": "Invalid listing ID"}}), 400

    if not listing:
        return jsonify({"data": None, "error": {"code": "NOT_FOUND", "message": "Listing not found"}}), 404

    if str(listing.get('farmer_id')) != str(farmer_id):
        return jsonify({"data": None, "error": {"code": "FORBIDDEN", "message": "Access denied"}}), 403

    if listing.get('status') != 'open':
        return jsonify({
            "data": None,
            "error": {"code": "INVALID_STATE", "message": f"Cannot cancel listing with status '{listing.get('status')}'"}
        }), 400

    updated = ProduceListing.update_status(listing_id, 'cancelled')
    return jsonify({"data": serialize_doc(updated), "error": None}), 200


@farmer_bp.route('/payouts', methods=['GET'])
@jwt_required()
@role_required('farmer')
def get_payouts():
    """Retrieve trades and payout history for the authenticated farmer."""
    farmer_id = get_jwt_identity()
    
    # Query trades where farmer_id is in farmer_shares
    farmer_trades = Trade.find_by_farmer(farmer_id)
    
    # If string search missed ObjectId-based shares, fallback to ObjectId query
    if not farmer_trades:
        try:
            from app.extensions import db
            farmer_trades = list(db.trades.find({'farmer_shares.farmer_id': ObjectId(farmer_id)}).sort('created_at', -1))
        except Exception:
            pass

    payouts = []
    for trade in farmer_trades:
        trade_id = str(trade['_id'])
        # Find share specific to this farmer
        for share in trade.get('farmer_shares', []):
            if str(share.get('farmer_id')) == str(farmer_id):
                payouts.append({
                    "id": f"PAY-{trade_id[-6:].upper()}",
                    "trade_id": trade_id,
                    "batch_id": str(trade.get('pooled_batch_id', '')),
                    "crop": trade.get('crop'),
                    "quantity_kg": share.get('quantity_kg', 0),
                    "clearing_price_per_kg": trade.get('clearing_price_per_kg', 0),
                    "amount": share.get('payout_amount', 0),
                    "status": trade.get('status', 'pending_payment'),
                    "settled_at": trade.get('settled_at'),
                    "date": trade.get('created_at'),
                })

    return jsonify({"data": payouts, "error": None}), 200


@farmer_bp.route('/buyer-bids', methods=['GET'])
@jwt_required()
@role_required('farmer')
def get_incoming_buyer_bids():
    """Retrieve open buyer bids matching crops listed by this farmer."""
    farmer_id = get_jwt_identity()
    listings = ProduceListing.find_by_farmer(farmer_id, status='open')
    crops = list({(l.get('crop') or '').lower() for l in listings})
    from app.models.bid import Bid
    all_bids = Bid.find_open()
    matching_bids = [b for b in all_bids if not crops or (b.get('crop') or '').lower() in crops]
    return jsonify({"data": serialize_docs(matching_bids), "error": None}), 200


@farmer_bp.route('/accept-bid', methods=['POST'])
@jwt_required()
@role_required('farmer')
def accept_buyer_bid():
    """Farmer accepts an open buyer bid, immediately confirming trade and generating payout."""
    farmer_id = get_jwt_identity()
    raw_data = request.get_json(silent=True) or {}
    bid_id = raw_data.get('bid_id')
    listing_id = raw_data.get('listing_id')

    if not bid_id or not listing_id:
        return jsonify({"data": None, "error": {"code": "VALIDATION", "message": "bid_id and listing_id are required"}}), 400

    from app.models.bid import Bid
    bid = Bid.find_by_id(bid_id)
    listing = ProduceListing.find_by_id(listing_id)

    if not bid or not listing:
        return jsonify({"data": None, "error": {"code": "NOT_FOUND", "message": "Bid or Listing not found"}}), 404

    if str(listing.get('farmer_id')) != str(farmer_id):
        return jsonify({"data": None, "error": {"code": "FORBIDDEN", "message": "Not your listing"}}), 403

    matched_qty = min(float(listing.get('quantity_remaining_kg') or listing.get('quantity_kg', 0)), float(bid.get('quantity_needed_kg', 0)))
    price = float(bid.get('max_price_per_kg', 0))
    total_amount = matched_qty * price

    now_iso = datetime.now(timezone.utc).isoformat()
    trade_doc = {
        'crop': listing.get('crop'),
        'quality_grade': listing.get('quality_grade', 'A'),
        'quantity_kg': matched_qty,
        'clearing_price_per_kg': price,
        'total_amount': total_amount,
        'buyer_id': bid.get('buyer_id'),
        'farmer_shares': [
            {
                'farmer_id': ObjectId(farmer_id) if ObjectId.is_valid(farmer_id) else farmer_id,
                'quantity_kg': matched_qty,
                'payout_amount': total_amount,
                'status': 'settled'
            }
        ],
        'status': 'settled',
        'settled_at': now_iso,
        'created_at': now_iso,
    }
    from app.extensions import db
    t_res = db.trades.insert_one(trade_doc)
    trade_doc['_id'] = t_res.inserted_id

    ProduceListing.update_status(listing_id, 'settled')
    Bid.update_status(bid_id, 'matched')

    return jsonify({"data": {"trade": serialize_doc(trade_doc), "message": "Trade confirmed and payout credited!"}, "error": None}), 200

