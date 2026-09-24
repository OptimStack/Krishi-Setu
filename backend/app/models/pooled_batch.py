from app import extensions
from bson import ObjectId
from datetime import datetime, timezone


class PooledBatch:
    collection = 'pooled_batches'

    @staticmethod
    def create(data):
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            'crop': data['crop'],
            'quality_grade': data['quality_grade'],
            'total_quantity_kg': float(data['total_quantity_kg']),
            'listing_ids': [ObjectId(lid) for lid in data['listing_ids']],
            'region': data.get('region', ''),
            'status': 'open',
            'created_at': now,
        }
        result = extensions.db.pooled_batches.insert_one(doc)
        doc['_id'] = result.inserted_id
        return doc

    @staticmethod
    def find_by_id(batch_id):
        try:
            return extensions.db.pooled_batches.find_one({'_id': ObjectId(batch_id)})
        except Exception:
            return None

    @staticmethod
    def find_open(crop=None, quality_grade=None):
        query = {'status': 'open'}
        if crop:
            query['crop'] = crop
        if quality_grade:
            query['quality_grade'] = quality_grade
        return list(extensions.db.pooled_batches.find(query).sort('created_at', -1))

    @staticmethod
    def update(batch_id, update_fields):
        try:
            return extensions.db.pooled_batches.find_one_and_update(
                {'_id': ObjectId(batch_id)},
                {'$set': update_fields},
                return_document=True
            )
        except Exception:
            return None

    @staticmethod
    def update_status(batch_id, new_status):
        return PooledBatch.update(batch_id, {'status': new_status})

    @staticmethod
    def add_listing(batch_id, listing_id, additional_kg):
        try:
            return extensions.db.pooled_batches.find_one_and_update(
                {'_id': ObjectId(batch_id)},
                {
                    '$push': {'listing_ids': ObjectId(listing_id)},
                    '$inc': {'total_quantity_kg': float(additional_kg)},
                },
                return_document=True
            )
        except Exception:
            return None

    @staticmethod
    def delete(batch_id):
        try:
            return extensions.db.pooled_batches.delete_one({'_id': ObjectId(batch_id)})
        except Exception:
            return None
