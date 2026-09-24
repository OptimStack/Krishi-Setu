from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorators import role_required
from app.utils.serializers import serialize_docs, serialize_doc
from app.models.auction_round import AuctionRound
from app.auction_engine.pooling import pool_open_listings
from app.auction_engine.batch_scheduler import run_batch_auction
from app.grading.review_queue import get_pending_review_queue, override_grading_result

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/auctions', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_auctions():
    """Retrieve recent auction rounds with status and trade references."""
    limit = request.args.get('limit', default=50, type=int)
    rounds = AuctionRound.find_recent(limit=limit)
    return jsonify({"data": serialize_docs(rounds), "error": None}), 200


@admin_bp.route('/trigger-auction', methods=['POST'])
@jwt_required()
@role_required('admin')
def trigger_auction():
    """Manually trigger a double-auction round across crops or for a specific crop."""
    payload = request.get_json(silent=True) or {}
    crop = payload.get('crop')
    pool_first = payload.get('pool_first', True)

    results = run_batch_auction(crop=crop, pool_first=pool_first)

    serialized_results = []
    for r in results:
        serialized_results.append({
            'crop': r['crop'],
            'round': serialize_doc(r['round']),
            'trades': serialize_docs(r['trades']),
            'trade_count': len(r['trades']),
        })

    return jsonify({
        "data": {
            "round_count": len(results),
            "results": serialized_results
        },
        "error": None
    }), 200


@admin_bp.route('/trigger-pooling', methods=['POST'])
@jwt_required()
@role_required('admin')
def trigger_pooling():
    """Manually trigger the cross-farmer pooling engine."""
    payload = request.get_json(silent=True) or {}
    min_qty = payload.get('min_quantity_kg')
    max_wait = payload.get('max_wait_minutes')
    max_dist = payload.get('max_distance_km', 50.0)

    batches = pool_open_listings(
        min_quantity_kg=min_qty,
        max_wait_minutes=max_wait,
        max_distance_km=max_dist,
        dry_run=False
    )
    return jsonify({
        "data": {
            "created_count": len(batches),
            "batches": serialize_docs(batches)
        },
        "error": None
    }), 200


@admin_bp.route('/pooling-preview', methods=['GET'])
@jwt_required()
@role_required('admin')
def preview_pooling():
    """Preview which listing clusters would be pooled without committing changes."""
    min_qty = request.args.get('min_quantity_kg', type=float)
    max_wait = request.args.get('max_wait_minutes', type=int)

    batches = pool_open_listings(
        min_quantity_kg=min_qty,
        max_wait_minutes=max_wait,
        dry_run=True
    )
    return jsonify({
        "data": {
            "preview_count": len(batches),
            "batches": serialize_docs(batches)
        },
        "error": None
    }), 200


@admin_bp.route('/grading/queue', methods=['GET'])
@admin_bp.route('/review-queue', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_grading_queue():
    """
    Retrieve listings flagged with needs_human_review = True awaiting admin verification.
    """
    limit = request.args.get('limit', default=50, type=int)
    pending_items = get_pending_review_queue(limit=limit)
    return jsonify({
        "data": {
            "count": len(pending_items),
            "queue": serialize_docs(pending_items)
        },
        "error": None
    }), 200


@admin_bp.route('/grading/<record_id>/override', methods=['POST'])
@admin_bp.route('/review-queue/<record_id>/override', methods=['POST'])
@jwt_required()
@role_required('admin')
def override_grade(record_id):
    """
    Admin manual override of AI-assigned produce grade.
    Updates the grading record and the associated listing.
    """
    admin_id = get_jwt_identity()
    payload = request.get_json(silent=True) or {}
    override = payload.get('override_grade') or payload.get('grade')

    if not override or override.upper() not in ['A', 'B', 'C']:
        return jsonify({
            "data": None,
            "error": {
                "code": "INVALID_GRADE",
                "message": "override_grade must be one of: A, B, C"
            }
        }), 400

    try:
        updated_record, updated_listing = override_grading_result(
            record_id=record_id,
            override_grade=override,
            reviewer_id=admin_id
        )
    except Exception as e:
        return jsonify({
            "data": None,
            "error": {"code": "OVERRIDE_FAILED", "message": str(e)}
        }), 400

    if not updated_record:
        return jsonify({
            "data": None,
            "error": {"code": "NOT_FOUND", "message": "Grading record not found"}
        }), 404

    return jsonify({
        "data": {
            "record": serialize_doc(updated_record),
            "listing": serialize_doc(updated_listing) if updated_listing else None
        },
        "error": None
    }), 200
