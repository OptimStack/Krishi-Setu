from bson import ObjectId
from datetime import datetime, timezone
from app import extensions


class AuctionRound:
    collection = 'auction_rounds'

    @staticmethod
    def create(data):
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            'crop': str(data['crop']).strip(),
            'window_start': data['window_start'],
            'window_end': data['window_end'],
            'status': data.get('status', 'scheduled'),
            'clearing_price_per_kg': data.get('clearing_price_per_kg'),
            'matched_trade_ids': [ObjectId(tid) for tid in data.get('matched_trade_ids', [])],
            'created_at': now,
        }
        result = extensions.db.auction_rounds.insert_one(doc)
        doc['_id'] = result.inserted_id
        return doc

    @staticmethod
    def find_by_id(round_id):
        try:
            return extensions.db.auction_rounds.find_one({'_id': ObjectId(round_id)})
        except Exception:
            return None

    @staticmethod
    def find_recent(limit=20):
        try:
            return list(extensions.db.auction_rounds.find().sort('created_at', -1).limit(limit))
        except Exception:
            return []

    @staticmethod
    def find_by_status(status):
        try:
            return list(extensions.db.auction_rounds.find({'status': status}).sort('created_at', -1))
        except Exception:
            return []

    @staticmethod
    def update(round_id, update_fields):
        try:
            return extensions.db.auction_rounds.find_one_and_update(
                {'_id': ObjectId(round_id)},
                {'$set': update_fields},
                return_document=True
            )
        except Exception:
            return None

    @staticmethod
    def complete(round_id, clearing_price, trade_ids):
        return AuctionRound.update(round_id, {
            'status': 'completed',
            'clearing_price_per_kg': float(clearing_price) if clearing_price is not None else None,
            'matched_trade_ids': [ObjectId(tid) for tid in trade_ids],
        })

    @staticmethod
    def mark_no_match(round_id):
        return AuctionRound.update(round_id, {
            'status': 'no_match',
            'clearing_price_per_kg': None,
            'matched_trade_ids': [],
        })

    @staticmethod
    def delete(round_id):
        try:
            return extensions.db.auction_rounds.delete_one({'_id': ObjectId(round_id)})
        except Exception:
            return None
