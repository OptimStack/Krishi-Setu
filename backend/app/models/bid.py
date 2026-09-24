from app import extensions
from bson import ObjectId
from datetime import datetime, timezone
from app.utils.logger import log_state_transition


class Bid:
    collection = 'bids'

    @staticmethod
    def create(data):
        now = datetime.now(timezone.utc).isoformat()
        qty = float(data.get('quantity_needed_kg') if data.get('quantity_needed_kg') is not None else data.get('quantity'))
        price = float(data.get('max_price_per_kg') if data.get('max_price_per_kg') is not None else data.get('price', data.get('bidAmount', 0)))
        doc = {
            'buyer_id': ObjectId(data['buyer_id']),
            'crop': str(data['crop']).strip(),
            'quantity_needed_kg': qty,
            'quantity_remaining_kg': float(data.get('quantity_remaining_kg', qty)),
            'max_price_per_kg': price,
            'min_quality_grade': data.get('min_quality_grade', 'C'),
            'status': 'open',
            'created_at': now,
            'updated_at': now,
        }
        if data.get('batch_id'):
            doc['batch_id'] = str(data['batch_id'])
        result = extensions.db.bids.insert_one(doc)
        doc['_id'] = result.inserted_id
        log_state_transition('bid', doc['_id'], None, 'open', {
            'crop': doc['crop'],
            'quantity_needed_kg': doc['quantity_needed_kg'],
            'max_price': doc['max_price_per_kg']
        })
        return doc

    @staticmethod
    def find_by_id(bid_id):
        try:
            return extensions.db.bids.find_one({'_id': ObjectId(bid_id)})
        except Exception:
            return None

    @staticmethod
    def find_by_buyer(buyer_id, status=None):
        try:
            query = {'buyer_id': ObjectId(buyer_id)}
        except Exception:
            return []
        if status:
            query['status'] = status
        return list(extensions.db.bids.find(query).sort('created_at', -1))

    @staticmethod
    def find_open(crop=None):
        query = {'status': 'open'}
        if crop:
            query['crop'] = crop
        return list(extensions.db.bids.find(query).sort('max_price_per_kg', -1))

    @staticmethod
    def update(bid_id, update_fields):
        update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
        try:
            return extensions.db.bids.find_one_and_update(
                {'_id': ObjectId(bid_id)},
                {'$set': update_fields},
                return_document=True
            )
        except Exception:
            return None

    @staticmethod
    def update_status(bid_id, new_status):
        updated = Bid.update(bid_id, {'status': new_status})
        if updated:
            log_state_transition('bid', bid_id, None, new_status)
        return updated

    @staticmethod
    def delete(bid_id):
        try:
            return extensions.db.bids.delete_one({'_id': ObjectId(bid_id)})
        except Exception:
            return None
