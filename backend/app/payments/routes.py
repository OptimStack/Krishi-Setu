import os
import json
import logging
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId

from app.utils.decorators import role_required
from app.utils.serializers import serialize_doc, serialize_docs
from app.models.trade import Trade
from app.models.payment import Payment
from app.payments.razorpay_client import (
    create_order,
    verify_payment_signature,
    verify_webhook_signature,
    _get_razorpay_credentials
)
from app.payments.payout_split import (
    settle_trade_and_distribute_payouts,
    handle_failed_payment_reopen
)

logger = logging.getLogger(__name__)

payments_bp = Blueprint('payments', __name__)


@payments_bp.route('/create-order', methods=['POST'])
@jwt_required()
@role_required('buyer')
def create_payment_order():
    """
    Creates a Razorpay payment order for a matched auction trade.
    Enforces idempotency on razorpay_order_id per masterplan Milestone 9.2.
    """
    buyer_id = get_jwt_identity()
    payload = request.get_json(silent=True) or {}
    trade_id = payload.get('trade_id')

    if not trade_id:
        return jsonify({
            "data": None,
            "error": {"code": "VALIDATION", "message": "trade_id is required"}
        }), 400

    trade = Trade.find_by_id(trade_id)
    if not trade:
        return jsonify({
            "data": None,
            "error": {"code": "NOT_FOUND", "message": "Trade not found"}
        }), 404

    if str(trade.get('buyer_id')) != str(buyer_id):
        return jsonify({
            "data": None,
            "error": {"code": "FORBIDDEN", "message": "Access denied to this trade"}
        }), 403

    if trade.get('status') == 'settled':
        return jsonify({
            "data": None,
            "error": {"code": "ALREADY_SETTLED", "message": "Trade has already been settled and paid"}
        }), 400

    key_id, _, _ = _get_razorpay_credentials()
    amount_inr = float(trade.get('total_amount', 0))

    # Idempotency: Check if an existing open order already exists for this trade
    existing_payment = Payment.find_by_trade(trade_id)
    if existing_payment and existing_payment.get('status') == 'created':
        return jsonify({
            "data": {
                "order_id": existing_payment['razorpay_order_id'],
                "amount": amount_inr,
                "amount_paise": int(round(amount_inr * 100)),
                "currency": "INR",
                "key_id": key_id,
                "trade_id": str(trade['_id']),
                "crop": trade.get('crop'),
                "quantity_kg": trade.get('quantity_kg'),
                "idempotent_reuse": True
            },
            "error": None
        }), 200

    # Create order via Razorpay client
    receipt = f"trade_{str(trade['_id'])[-10:]}"
    order = create_order(
        amount_inr=amount_inr,
        receipt=receipt,
        notes={
            "trade_id": str(trade['_id']),
            "buyer_id": str(buyer_id),
            "crop": str(trade.get('crop')),
        }
    )

    # Persist Payment record
    payment_doc = Payment.create({
        "trade_id": trade['_id'],
        "razorpay_order_id": order['id'],
        "amount": amount_inr,
        "currency": "INR",
        "status": "created",
        "webhook_verified": False
    })

    # Update trade status
    Trade.update(trade_id, {"status": "payment_processing"})

    return jsonify({
        "data": {
            "order_id": order['id'],
            "amount": amount_inr,
            "amount_paise": int(round(amount_inr * 100)),
            "currency": "INR",
            "key_id": key_id,
            "trade_id": str(trade['_id']),
            "crop": trade.get('crop'),
            "quantity_kg": trade.get('quantity_kg'),
            "payment_id": str(payment_doc['_id']),
            "idempotent_reuse": False
        },
        "error": None
    }), 201


@payments_bp.route('/verify', methods=['POST'])
@jwt_required()
@role_required('buyer')
def verify_payment():
    """
    Verifies client-side Razorpay payment completion signature
    and marks trade settled, distributing farmer shares.
    """
    buyer_id = get_jwt_identity()
    payload = request.get_json(silent=True) or {}

    trade_id = payload.get('trade_id')
    order_id = payload.get('razorpay_order_id')
    payment_id = payload.get('razorpay_payment_id')
    signature = payload.get('razorpay_signature')

    if not all([trade_id, order_id, payment_id, signature]):
        return jsonify({
            "data": None,
            "error": {
                "code": "MISSING_PAYMENT_DETAILS",
                "message": "trade_id, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required"
            }
        }), 400

    trade = Trade.find_by_id(trade_id)
    if not trade:
        return jsonify({
            "data": None,
            "error": {"code": "NOT_FOUND", "message": "Trade not found"}
        }), 404

    if str(trade.get('buyer_id')) != str(buyer_id):
        return jsonify({
            "data": None,
            "error": {"code": "FORBIDDEN", "message": "Access denied"}
        }), 403

    # Signature verification
    is_valid = verify_payment_signature(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature
    )
    if not is_valid:
        return jsonify({
            "data": None,
            "error": {"code": "INVALID_SIGNATURE", "message": "Razorpay payment signature verification failed"}
        }), 400

    # Idempotent record capture in Payment model
    updated_payment = Payment.record_capture(
        razorpay_order_id=order_id,
        payment_id=payment_id,
        signature=signature,
        webhook_verified=False
    )

    # Finalize trade & settle farmer shares
    settlement_res = settle_trade_and_distribute_payouts(trade_id)

    return jsonify({
        "data": {
            "status": "settled",
            "trade": serialize_doc(settlement_res['trade']),
            "payment": serialize_doc(updated_payment),
            "settled_at": settlement_res['settled_at']
        },
        "error": None
    }), 200


@payments_bp.route('/webhook', methods=['POST'])
def razorpay_webhook():
    """
    Razorpay Webhook listener for payment events.
    Verifies X-Razorpay-Signature header and processes payment.captured or payment.failed.
    Enforces idempotency on razorpay_order_id.
    """
    raw_payload = request.get_data()
    signature = request.headers.get('X-Razorpay-Signature')

    if not signature:
        return jsonify({
            "data": None,
            "error": {"code": "MISSING_SIGNATURE", "message": "X-Razorpay-Signature header missing"}
        }), 400

    if not verify_webhook_signature(raw_payload, signature):
        return jsonify({
            "data": None,
            "error": {"code": "INVALID_SIGNATURE", "message": "Webhook signature verification failed"}
        }), 400

    try:
        event_data = json.loads(raw_payload.decode('utf-8'))
    except Exception as e:
        return jsonify({"data": None, "error": {"code": "BAD_JSON", "message": str(e)}}), 400

    event_type = event_data.get('event')
    payload_entity = event_data.get('payload', {}).get('payment', {}).get('entity', {})
    order_id = payload_entity.get('order_id')
    payment_id = payload_entity.get('id')

    if not order_id:
        # Fallback to direct order payload if order.paid event
        order_id = event_data.get('payload', {}).get('order', {}).get('entity', {}).get('id')

    logger.info("Received Razorpay webhook event '%s' for order %s", event_type, order_id)

    if event_type in ['payment.captured', 'order.paid']:
        if order_id:
            payment_record = Payment.find_by_razorpay_order(order_id)
            if payment_record:
                trade_id = str(payment_record['trade_id'])
                # Idempotent capture
                Payment.record_capture(
                    razorpay_order_id=order_id,
                    payment_id=payment_id or "webhook_captured",
                    signature=signature,
                    webhook_verified=True
                )
                try:
                    settle_trade_and_distribute_payouts(trade_id)
                except Exception as e:
                    logger.warning("Trade settlement already applied or threw: %s", e)

        return jsonify({"status": "ok", "message": "Payment captured and trade settled"}), 200

    elif event_type == 'payment.failed':
        # Section 9 Edge Case 9: Trade fails -> reopen batch and listings
        if order_id:
            payment_record = Payment.find_by_razorpay_order(order_id)
            if payment_record:
                trade_id = str(payment_record['trade_id'])
                Payment.record_failure(order_id, error_details=payload_entity.get('error_description'))
                try:
                    handle_failed_payment_reopen(trade_id)
                except Exception as e:
                    logger.error("Failed to reopen trade %s on payment failure: %s", trade_id, e)

        return jsonify({"status": "ok", "message": "Payment failure handled and lots reopened"}), 200

    return jsonify({"status": "ignored", "event": event_type}), 200


@payments_bp.route('/trade/<trade_id>', methods=['GET'])
@jwt_required()
def get_trade_payment(trade_id):
    """Retrieve payment record for a trade."""
    payment = Payment.find_by_trade(trade_id)
    if not payment:
        return jsonify({"data": None, "error": {"code": "NOT_FOUND", "message": "No payment record found"}}), 404
    return jsonify({"data": serialize_doc(payment), "error": None}), 200
