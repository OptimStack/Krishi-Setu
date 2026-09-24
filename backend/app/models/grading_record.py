from datetime import datetime, timezone
from bson import ObjectId
from app import extensions


class GradingRecord:
    collection = 'grading_records'

    @staticmethod
    def create(data):
        now = datetime.now(timezone.utc).isoformat()
        listing_id = data.get('listing_id')
        if listing_id and not isinstance(listing_id, ObjectId):
            listing_id = ObjectId(str(listing_id))

        doc = {
            'listing_id': listing_id,
            'image_url': data.get('image_url', ''),
            'predicted_grade': data.get('predicted_grade', 'B'),
            'confidence': float(data.get('confidence', 0.0)),
            'needs_human_review': bool(data.get('needs_human_review', False)),
            'manual_override_grade': data.get('manual_override_grade', None),
            'reviewed_by': ObjectId(str(data['reviewed_by'])) if data.get('reviewed_by') else None,
            'created_at': now,
        }
        result = extensions.db.grading_records.insert_one(doc)
        doc['_id'] = result.inserted_id
        return doc

    @staticmethod
    def find_by_id(record_id):
        if not isinstance(record_id, ObjectId):
            record_id = ObjectId(str(record_id))
        return extensions.db.grading_records.find_one({'_id': record_id})

    @staticmethod
    def find_by_listing(listing_id):
        if not isinstance(listing_id, ObjectId):
            listing_id = ObjectId(str(listing_id))
        return extensions.db.grading_records.find_one({'listing_id': listing_id})

    @staticmethod
    def find_pending_review(limit=50):
        """
        Find records requiring human admin review (needs_human_review: True and no manual override yet).
        """
        return list(
            extensions.db.grading_records.find({
                'needs_human_review': True,
                'manual_override_grade': None,
            }).sort('created_at', 1).limit(limit)
        )

    @staticmethod
    def find_all(limit=50):
        return list(
            extensions.db.grading_records.find().sort('created_at', -1).limit(limit)
        )

    @staticmethod
    def override_grade(record_id, grade, reviewer_id=None):
        """
        Admin manual override of quality grade. Sets needs_human_review = False.
        """
        if not isinstance(record_id, ObjectId):
            record_id = ObjectId(str(record_id))

        update_fields = {
            'manual_override_grade': grade,
            'needs_human_review': False,
            'reviewed_at': datetime.now(timezone.utc).isoformat()
        }
        if reviewer_id:
            update_fields['reviewed_by'] = ObjectId(str(reviewer_id))

        return extensions.db.grading_records.find_one_and_update(
            {'_id': record_id},
            {'$set': update_fields},
            return_document=True
        )

    @staticmethod
    def delete(record_id):
        if not isinstance(record_id, ObjectId):
            record_id = ObjectId(str(record_id))
        return extensions.db.grading_records.delete_one({'_id': record_id})
