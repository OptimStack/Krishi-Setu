from app.extensions import db
from bson import ObjectId
from datetime import datetime, timezone


class User:
    collection = 'users'

    @staticmethod
    def create(data):
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            'role': data['role'],  # farmer | buyer | fpo | admin
            'name': data['name'],
            'phone': data['phone'],
            'email': data.get('email'),
            'password_hash': data['password_hash'],
            'language_pref': data.get('language_pref', 'en'),
            'location': data.get('location', {}),
            'kyc_verified': False,
            'fpo_id': data.get('fpo_id'),
            'created_at': now,
            'updated_at': now,
        }
        result = db.users.insert_one(doc)
        doc['_id'] = result.inserted_id
        return doc

    @staticmethod
    def find_by_id(user_id):
        return db.users.find_one({'_id': ObjectId(user_id)})

    @staticmethod
    def find_by_phone(phone):
        return db.users.find_one({'phone': phone})

    @staticmethod
    def find_by_email(email):
        return db.users.find_one({'email': email})

    @staticmethod
    def update(user_id, update_fields):
        update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
        return db.users.find_one_and_update(
            {'_id': ObjectId(user_id)},
            {'$set': update_fields},
            return_document=True
        )

    @staticmethod
    def delete(user_id):
        return db.users.delete_one({'_id': ObjectId(user_id)})

    @staticmethod
    def find_all(filters=None, skip=0, limit=50):
        query = filters or {}
        return list(db.users.find(query).skip(skip).limit(limit))
