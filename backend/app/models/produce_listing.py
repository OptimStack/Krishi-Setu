from app import extensions
from bson import ObjectId
from datetime import datetime, timezone


class ProduceListing:
    collection = 'produce_listings'

    @staticmethod
    def create(data):
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            'farmer_id': ObjectId(data['farmer_id']),
            'crop': data['crop'],
            'variety': data.get('variety', ''),
            'quantity_kg': float(data['quantity_kg']),
            'quantity_remaining_kg': float(data['quantity_kg']),
            'ask_price_per_kg': float(data['ask_price_per_kg']),
            'min_acceptable_price_per_kg': float(data.get('min_acceptable_price_per_kg', data['ask_price_per_kg'])),
            'quality_grade': data.get('quality_grade', 'ungraded'),
            'grading_record_id': None,
            'status': 'open',
            'pooled_batch_id': None,
            'harvest_date': data.get('harvest_date'),
            'location': data.get('location', {}),
            'image_url': data.get('image_url'),
            'created_at': now,
            'updated_at': now,
        }
        result = extensions.db.produce_listings.insert_one(doc)
        doc['_id'] = result.inserted_id
        return doc

    @staticmethod
    def find_by_id(listing_id):
        return extensions.db.produce_listings.find_one({'_id': ObjectId(listing_id)})

    @staticmethod
    def find_by_farmer(farmer_id, status=None):
        query = {'farmer_id': ObjectId(farmer_id)}
        if status:
            query['status'] = status
        return list(extensions.db.produce_listings.find(query).sort('created_at', -1))

    @staticmethod
    def find_open(crop=None, quality_grade=None):
        query = {'status': 'open'}
        if crop:
            query['crop'] = crop
        if quality_grade:
            query['quality_grade'] = quality_grade
        return list(extensions.db.produce_listings.find(query).sort('created_at', 1))

    @staticmethod
    def update(listing_id, update_fields):
        update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
        return extensions.db.produce_listings.find_one_and_update(
            {'_id': ObjectId(listing_id)},
            {'$set': update_fields},
            return_document=True
        )

    @staticmethod
    def update_status(listing_id, new_status):
        return ProduceListing.update(listing_id, {'status': new_status})

    @staticmethod
    def assign_to_pool(listing_id, batch_id):
        return ProduceListing.update(listing_id, {
            'status': 'pooled',
            'pooled_batch_id': ObjectId(batch_id),
        })

    @staticmethod
    def delete(listing_id):
        return extensions.db.produce_listings.delete_one({'_id': ObjectId(listing_id)})
