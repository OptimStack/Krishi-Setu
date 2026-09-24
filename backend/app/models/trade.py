from bson import ObjectId
from datetime import datetime, timezone
from app import extensions
from app.utils.logger import log_state_transition


class Trade:
    collection = 'trades'

    @staticmethod
    def create(data):
        now = datetime.now(timezone.utc).isoformat()
        qty = float(data['quantity_kg'])
        price = float(data['clearing_price_per_kg'])
        total = float(data.get('total_amount', round(qty * price, 2)))

        # Format farmer_shares defensively
        shares = []
        for s in data.get('farmer_shares', []):
            share_doc = {
                'farmer_id': ObjectId(s['farmer_id']) if isinstance(s['farmer_id'], (str, ObjectId)) else s['farmer_id'],
                'quantity_kg': float(s['quantity_kg']),
                'payout_amount': float(s['payout_amount']),
            }
            if s.get('listing_id'):
                share_doc['listing_id'] = ObjectId(s['listing_id']) if isinstance(s['listing_id'], (str, ObjectId)) else s['listing_id']
            shares.append(share_doc)

        doc = {
            'auction_round_id': ObjectId(data['auction_round_id']),
            'buyer_id': ObjectId(data['buyer_id']),
            'pooled_batch_id': ObjectId(data['pooled_batch_id']),
            'farmer_shares': shares,
            'crop': str(data['crop']).strip(),
            'quantity_kg': qty,
            'clearing_price_per_kg': price,
            'total_amount': total,
            'status': data.get('status', 'pending_payment'),
            'created_at': now,
            'settled_at': None,
        }
        result = extensions.db.trades.insert_one(doc)
        doc['_id'] = result.inserted_id
        log_state_transition('trade', doc['_id'], None, doc['status'], {
            'crop': doc['crop'],
            'quantity_kg': doc['quantity_kg'],
            'total_amount': doc['total_amount'],
            'farmer_count': len(shares)
        })
        return doc

    @staticmethod
    def find_by_id(trade_id):
        try:
            return extensions.db.trades.find_one({'_id': ObjectId(trade_id)})
        except Exception:
            return None

    @staticmethod
    def find_by_buyer(buyer_id):
        try:
            return list(extensions.db.trades.find({'buyer_id': ObjectId(buyer_id)}).sort('created_at', -1))
        except Exception:
            return []

    @staticmethod
    def find_by_farmer(farmer_id):
        try:
            return list(extensions.db.trades.find({
                '$or': [
                    {'farmer_shares.farmer_id': ObjectId(farmer_id)},
                    {'farmer_shares.farmer_id': str(farmer_id)},
                ]
            }).sort('created_at', -1))
        except Exception:
            try:
                return list(extensions.db.trades.find({'farmer_shares.farmer_id': str(farmer_id)}).sort('created_at', -1))
            except Exception:
                return []

    @staticmethod
    def find_by_status(status):
        try:
            return list(extensions.db.trades.find({'status': status}).sort('created_at', -1))
        except Exception:
            return []

    @staticmethod
    def update(trade_id, update_fields):
        try:
            res = extensions.db.trades.find_one_and_update(
                {'_id': ObjectId(trade_id)},
                {'$set': update_fields},
                return_document=True
            )
            if res and 'status' in update_fields:
                log_state_transition('trade', trade_id, None, update_fields['status'])
            return res
        except Exception:
            return None

    @staticmethod
    def settle(trade_id):
        now = datetime.now(timezone.utc).isoformat()
        return Trade.update(trade_id, {'status': 'settled', 'settled_at': now})

    @staticmethod
    def delete(trade_id):
        try:
            return extensions.db.trades.delete_one({'_id': ObjectId(trade_id)})
        except Exception:
            return None
