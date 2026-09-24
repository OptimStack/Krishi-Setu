"""Initialize MongoDB collections with schema validation and indexes.

Idempotent — safe to run multiple times. Uses collMod to update validators
on existing collections rather than failing.

Usage:
    cd backend && python -m scripts.init_db
    # or from project root:
    python scripts/init_db.py
"""
import os
import sys
from pathlib import Path
from pymongo import MongoClient, ASCENDING, GEOSPHERE
from pymongo.errors import CollectionInvalid
from dotenv import load_dotenv

# Load env from backend/.env
env_path = Path(__file__).resolve().parent.parent / 'backend' / '.env'
load_dotenv(env_path)

MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu')
DB_NAME = os.environ.get('MONGODB_DB_NAME', 'krishisetu')


def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    return client[DB_NAME]


# ---------- Schema validators (Section 5) ----------

SCHEMAS = {
    'users': {
        'bsonType': 'object',
        'required': ['role', 'name', 'phone', 'password_hash', 'created_at'],
        'properties': {
            'role': {'bsonType': 'string', 'enum': ['farmer', 'buyer', 'fpo', 'admin']},
            'name': {'bsonType': 'string'},
            'phone': {'bsonType': 'string'},
            'email': {'bsonType': ['string', 'null']},
            'password_hash': {'bsonType': 'string'},
            'language_pref': {'bsonType': 'string'},
            'location': {'bsonType': 'object'},
            'kyc_verified': {'bsonType': 'bool'},
            'fpo_id': {'bsonType': ['objectId', 'null']},
            'created_at': {'bsonType': 'string'},
            'updated_at': {'bsonType': 'string'},
        },
    },
    'produce_listings': {
        'bsonType': 'object',
        'required': ['farmer_id', 'crop', 'quantity_kg', 'ask_price_per_kg', 'status', 'created_at'],
        'properties': {
            'farmer_id': {'bsonType': 'objectId'},
            'crop': {'bsonType': 'string'},
            'variety': {'bsonType': 'string'},
            'quantity_kg': {'bsonType': 'double'},
            'quantity_remaining_kg': {'bsonType': 'double'},
            'ask_price_per_kg': {'bsonType': 'double'},
            'min_acceptable_price_per_kg': {'bsonType': 'double'},
            'quality_grade': {'bsonType': 'string', 'enum': ['A', 'B', 'C', 'ungraded']},
            'grading_record_id': {'bsonType': ['objectId', 'null']},
            'status': {
                'bsonType': 'string',
                'enum': ['open', 'pooled', 'matched', 'settled', 'expired', 'cancelled'],
            },
            'pooled_batch_id': {'bsonType': ['objectId', 'null']},
            'harvest_date': {'bsonType': ['string', 'null']},
            'location': {'bsonType': 'object'},
            'created_at': {'bsonType': 'string'},
            'updated_at': {'bsonType': 'string'},
        },
    },
    'pooled_batches': {
        'bsonType': 'object',
        'required': ['crop', 'quality_grade', 'total_quantity_kg', 'listing_ids', 'status', 'created_at'],
        'properties': {
            'crop': {'bsonType': 'string'},
            'quality_grade': {'bsonType': 'string', 'enum': ['A', 'B', 'C']},
            'total_quantity_kg': {'bsonType': 'double'},
            'listing_ids': {'bsonType': 'array', 'items': {'bsonType': 'objectId'}},
            'region': {'bsonType': 'string'},
            'status': {
                'bsonType': 'string',
                'enum': ['open', 'locked_for_auction', 'matched', 'partially_matched', 'closed'],
            },
            'created_at': {'bsonType': 'string'},
        },
    },
    'bids': {
        'bsonType': 'object',
        'required': ['buyer_id', 'crop', 'quantity_needed_kg', 'max_price_per_kg', 'status', 'created_at'],
        'properties': {
            'buyer_id': {'bsonType': 'objectId'},
            'crop': {'bsonType': 'string'},
            'quantity_needed_kg': {'bsonType': 'double'},
            'quantity_remaining_kg': {'bsonType': 'double'},
            'max_price_per_kg': {'bsonType': 'double'},
            'min_quality_grade': {'bsonType': 'string', 'enum': ['A', 'B', 'C']},
            'status': {
                'bsonType': 'string',
                'enum': ['open', 'matched', 'partially_matched', 'expired', 'cancelled'],
            },
            'created_at': {'bsonType': 'string'},
            'updated_at': {'bsonType': 'string'},
        },
    },
    'auction_rounds': {
        'bsonType': 'object',
        'required': ['crop', 'window_start', 'window_end', 'status', 'created_at'],
        'properties': {
            'crop': {'bsonType': 'string'},
            'window_start': {'bsonType': 'string'},
            'window_end': {'bsonType': 'string'},
            'status': {
                'bsonType': 'string',
                'enum': ['scheduled', 'running', 'completed', 'no_match'],
            },
            'clearing_price_per_kg': {'bsonType': ['double', 'null']},
            'matched_trade_ids': {'bsonType': 'array'},
            'created_at': {'bsonType': 'string'},
        },
    },
    'trades': {
        'bsonType': 'object',
        'required': ['auction_round_id', 'buyer_id', 'pooled_batch_id', 'crop', 'quantity_kg',
                     'clearing_price_per_kg', 'total_amount', 'status', 'created_at'],
        'properties': {
            'auction_round_id': {'bsonType': 'objectId'},
            'buyer_id': {'bsonType': 'objectId'},
            'pooled_batch_id': {'bsonType': 'objectId'},
            'farmer_shares': {'bsonType': 'array'},
            'crop': {'bsonType': 'string'},
            'quantity_kg': {'bsonType': 'double'},
            'clearing_price_per_kg': {'bsonType': 'double'},
            'total_amount': {'bsonType': 'double'},
            'status': {
                'bsonType': 'string',
                'enum': ['pending_payment', 'payment_processing', 'settled', 'failed', 'disputed'],
            },
            'created_at': {'bsonType': 'string'},
            'settled_at': {'bsonType': ['string', 'null']},
        },
    },
    'payments': {
        'bsonType': 'object',
        'required': ['trade_id', 'razorpay_order_id', 'amount', 'currency', 'status', 'created_at'],
        'properties': {
            'trade_id': {'bsonType': 'objectId'},
            'razorpay_order_id': {'bsonType': 'string'},
            'razorpay_payment_id': {'bsonType': ['string', 'null']},
            'razorpay_signature': {'bsonType': ['string', 'null']},
            'amount': {'bsonType': 'double'},
            'currency': {'bsonType': 'string'},
            'status': {
                'bsonType': 'string',
                'enum': ['created', 'authorized', 'captured', 'failed', 'refunded'],
            },
            'webhook_verified': {'bsonType': 'bool'},
            'created_at': {'bsonType': 'string'},
            'updated_at': {'bsonType': 'string'},
        },
    },
    'grading_records': {
        'bsonType': 'object',
        'required': ['listing_id', 'image_url', 'predicted_grade', 'confidence', 'created_at'],
        'properties': {
            'listing_id': {'bsonType': 'objectId'},
            'image_url': {'bsonType': 'string'},
            'predicted_grade': {'bsonType': 'string', 'enum': ['A', 'B', 'C']},
            'confidence': {'bsonType': 'double'},
            'needs_human_review': {'bsonType': 'bool'},
            'manual_override_grade': {'bsonType': ['string', 'null']},
            'reviewed_by': {'bsonType': ['objectId', 'null']},
            'created_at': {'bsonType': 'string'},
        },
    },
    'market_prices': {
        'bsonType': 'object',
        'required': ['crop', 'mandi_name', 'source', 'date', 'modal_price_per_quintal', 'ingested_at'],
        'properties': {
            'crop': {'bsonType': 'string'},
            'mandi_name': {'bsonType': 'string'},
            'source': {'bsonType': 'string', 'enum': ['enam', 'agmarknet', 'msamb', 'data_gov_in']},
            'date': {'bsonType': 'string'},
            'min_price_per_quintal': {'bsonType': 'double'},
            'max_price_per_quintal': {'bsonType': 'double'},
            'modal_price_per_quintal': {'bsonType': 'double'},
            'ingested_at': {'bsonType': 'string'},
        },
    },
    'warehouses': {
        'bsonType': 'object',
        'required': ['name', 'type', 'location'],
        'properties': {
            'name': {'bsonType': 'string'},
            'type': {'bsonType': 'string', 'enum': ['warehouse', 'silo', 'cold_storage']},
            'location': {'bsonType': 'object'},
            'capacity_tonnes': {'bsonType': 'double'},
            'crop_types_supported': {'bsonType': 'array'},
            'contact_phone': {'bsonType': 'string'},
            'source': {'bsonType': 'string'},
        },
    },
}

# ---------- Indexes (Section 5.11) ----------

INDEXES = {
    'users': [
        ([('phone', ASCENDING)], {'unique': True, 'name': 'idx_phone_unique'}),
    ],
    'produce_listings': [
        ([('status', ASCENDING)], {'name': 'idx_status'}),
        ([('crop', ASCENDING)], {'name': 'idx_crop'}),
        ([('farmer_id', ASCENDING)], {'name': 'idx_farmer_id'}),
        ([('location.geo', GEOSPHERE)], {'name': 'idx_location_geo'}),
    ],
    'bids': [
        ([('status', ASCENDING)], {'name': 'idx_status'}),
        ([('crop', ASCENDING)], {'name': 'idx_crop'}),
        ([('buyer_id', ASCENDING)], {'name': 'idx_buyer_id'}),
    ],
    'pooled_batches': [
        ([('status', ASCENDING)], {'name': 'idx_status'}),
        ([('crop', ASCENDING)], {'name': 'idx_crop'}),
    ],
    'trades': [
        ([('status', ASCENDING)], {'name': 'idx_status'}),
        ([('buyer_id', ASCENDING)], {'name': 'idx_buyer_id'}),
    ],
    'market_prices': [
        ([('crop', ASCENDING), ('mandi_name', ASCENDING), ('date', ASCENDING)],
         {'name': 'idx_crop_mandi_date', 'unique': True}),
    ],
    'warehouses': [
        ([('location.geo', GEOSPHERE)], {'name': 'idx_location_geo'}),
    ],
}


def ensure_collection(db, name, schema):
    """Create or update a collection with $jsonSchema validation."""
    validator = {'$jsonSchema': schema}
    try:
        db.create_collection(name, validator=validator)
        print(f'  ✓ Created collection: {name}')
    except CollectionInvalid:
        # Collection already exists — update the validator
        db.command('collMod', name, validator=validator)
        print(f'  ↻ Updated validator: {name}')


def ensure_indexes(db, name, index_defs):
    """Create indexes idempotently."""
    coll = db[name]
    for keys, kwargs in index_defs:
        coll.create_index(keys, **kwargs)
    print(f'  ✓ Indexes ready:   {name} ({len(index_defs)} index(es))')


def main():
    print(f'Connecting to MongoDB: {DB_NAME}...')
    db = get_db()
    print('Connected.\n')

    print('--- Collections & schema validation ---')
    for name, schema in SCHEMAS.items():
        ensure_collection(db, name, schema)

    print('\n--- Indexes ---')
    for name, index_defs in INDEXES.items():
        ensure_indexes(db, name, index_defs)

    print('\n✅ Database initialization complete.')


if __name__ == '__main__':
    main()
