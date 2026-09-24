from datetime import datetime, timezone
from bson import ObjectId
from app import extensions
from app.utils.logger import log_state_transition


class Payment:
    collection = 'payments'

    @staticmethod
    def create(data):
        now = datetime.now(timezone.utc).isoformat()
        trade_id = data['trade_id']
        if not isinstance(trade_id, ObjectId):
            trade_id = ObjectId(str(trade_id))

        doc = {
            'trade_id': trade_id,
            'razorpay_order_id': str(data['razorpay_order_id']),
            'razorpay_payment_id': data.get('razorpay_payment_id'),
            'razorpay_signature': data.get('razorpay_signature'),
            'amount': float(data['amount']),
            'currency': data.get('currency', 'INR'),
            'status': data.get('status', 'created'),  # created | authorized | captured | failed | refunded
            'webhook_verified': bool(data.get('webhook_verified', False)),
            'created_at': now,
            'updated_at': now,
        }
        result = extensions.db.payments.insert_one(doc)
        doc['_id'] = result.inserted_id
        log_state_transition('payment', doc['_id'], None, doc['status'], {
            'trade_id': str(doc['trade_id']),
            'amount': doc['amount'],
            'order_id': doc['razorpay_order_id']
        })
        return doc

    @staticmethod
    def find_by_id(payment_id):
        try:
            return extensions.db.payments.find_one({'_id': ObjectId(str(payment_id))})
        except Exception:
            return None

    @staticmethod
    def find_by_trade(trade_id):
        try:
            return extensions.db.payments.find_one({'trade_id': ObjectId(str(trade_id))})
        except Exception:
            return None

    @staticmethod
    def find_by_razorpay_order(order_id):
        return extensions.db.payments.find_one({'razorpay_order_id': str(order_id)})

    @staticmethod
    def update(payment_id, update_fields):
        update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
        try:
            res = extensions.db.payments.find_one_and_update(
                {'_id': ObjectId(str(payment_id))},
                {'$set': update_fields},
                return_document=True
            )
            if res and 'status' in update_fields:
                log_state_transition('payment', payment_id, None, update_fields['status'])
            return res
        except Exception:
            return None

    @staticmethod
    def record_capture(razorpay_order_id, payment_id, signature, webhook_verified=False):
        """
        Idempotent capture recording keyed on razorpay_order_id.
        """
        now = datetime.now(timezone.utc).isoformat()
        return extensions.db.payments.find_one_and_update(
            {'razorpay_order_id': str(razorpay_order_id)},
            {'$set': {
                'razorpay_payment_id': str(payment_id),
                'razorpay_signature': str(signature) if signature else None,
                'status': 'captured',
                'webhook_verified': bool(webhook_verified),
                'updated_at': now,
            }},
            return_document=True
        )

    @staticmethod
    def record_failure(razorpay_order_id, error_details=None):
        now = datetime.now(timezone.utc).isoformat()
        update_data = {
            'status': 'failed',
            'updated_at': now,
        }
        if error_details:
            update_data['error_details'] = error_details

        return extensions.db.payments.find_one_and_update(
            {'razorpay_order_id': str(razorpay_order_id)},
            {'$set': update_data},
            return_document=True
        )

    @staticmethod
    def verify_webhook(razorpay_order_id, payment_id, signature):
        return Payment.record_capture(
            razorpay_order_id=razorpay_order_id,
            payment_id=payment_id,
            signature=signature,
            webhook_verified=True
        )

    @staticmethod
    def delete(payment_id):
        try:
            return extensions.db.payments.delete_one({'_id': ObjectId(str(payment_id))})
        except Exception:
            return None
