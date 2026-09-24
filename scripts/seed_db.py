"""Seed the MongoDB database with realistic demo data for Maharashtra.

Usage:
    python scripts/seed_db.py [--clean] [--uri <mongodb_uri>] [--export-only]
"""
import os
import sys
import json
import argparse
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, ConfigurationError
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
from bson.objectid import ObjectId

# Load env from backend/.env
env_path = Path(__file__).resolve().parent.parent / 'backend' / '.env'
load_dotenv(env_path)

DEFAULT_MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu')
DB_NAME = os.environ.get('MONGODB_DB_NAME', 'krishisetu')
FIXTURES_PATH = Path(__file__).resolve().parent.parent / 'backend' / 'demo_fixtures.json'


def get_db(uri=None):
    target_uri = uri or DEFAULT_MONGO_URI
    if '<user>' in target_uri or '<password>' in target_uri:
        print("[!] Detected unconfigured placeholder in MONGODB_URI. Falling back to localhost:27017...")
        target_uri = 'mongodb://localhost:27017/krishisetu'
    
    client = MongoClient(target_uri, serverSelectionTimeoutMS=2500)
    client.admin.command('ping')
    return client[DB_NAME]


def clear_db(db):
    print("Clearing existing demo collections...")
    collections = [
        'users', 'produce_listings', 'pooled_batches', 'bids',
        'auction_rounds', 'trades', 'payments', 'market_prices', 'warehouses'
    ]
    for coll in collections:
        db[coll].delete_many({})
    print("Database cleared.")


def build_demo_dataset():
    """Builds a rich, coherent dataset simulating real-world farming in Maharashtra."""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    password = generate_password_hash('demo123')

    # 1. Users
    farmer_ramesh_id = ObjectId()
    farmer_suresh_id = ObjectId()
    farmer_santosh_id = ObjectId()
    buyer_freshfarm_id = ObjectId()
    buyer_mahaagri_id = ObjectId()
    admin_id = ObjectId()

    users = [
        {
            "_id": farmer_ramesh_id,
            "role": "farmer",
            "name": "Ramesh Patil",
            "phone": "9876543210",
            "password_hash": password,
            "location": {"type": "Point", "geo": [73.9898, 20.0875], "address": "Niphad, Nashik, Maharashtra"},
            "kyc_verified": True,
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "_id": farmer_suresh_id,
            "role": "farmer",
            "name": "Suresh Deshmukh",
            "phone": "9876543211",
            "password_hash": password,
            "location": {"type": "Point", "geo": [74.0150, 20.0650], "address": "Lasalgaon, Nashik, Maharashtra"},
            "kyc_verified": True,
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "_id": farmer_santosh_id,
            "role": "farmer",
            "name": "Santosh Pawar",
            "phone": "9876543212",
            "password_hash": password,
            "location": {"type": "Point", "geo": [73.9500, 20.0400], "address": "Yeola, Nashik, Maharashtra"},
            "kyc_verified": True,
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "_id": buyer_freshfarm_id,
            "role": "buyer",
            "name": "FreshFarm Retail Pvt Ltd",
            "phone": "9876543220",
            "password_hash": password,
            "location": {"type": "Point", "geo": [73.8567, 18.5204], "address": "Pune Agribusiness Hub, Pune"},
            "kyc_verified": True,
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "_id": buyer_mahaagri_id,
            "role": "buyer",
            "name": "MahaAgri Commodity Traders",
            "phone": "9876543221",
            "password_hash": password,
            "location": {"type": "Point", "geo": [72.8777, 19.0760], "address": "Vashi APMC, Navi Mumbai"},
            "kyc_verified": True,
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "_id": admin_id,
            "role": "admin",
            "name": "KrishiSetu Admin",
            "phone": "9000000000",
            "password_hash": password,
            "location": {"type": "Point", "geo": [73.8567, 18.5204], "address": "Operations Center, Pune"},
            "kyc_verified": True,
            "created_at": now_iso,
            "updated_at": now_iso
        }
    ]

    # 2. Produce Listings
    # Trio of smallholder listings perfectly positioned for cross-farmer pooling demo
    listing_pool_1_id = ObjectId()
    listing_pool_2_id = ObjectId()
    listing_pool_3_id = ObjectId()
    listing_review_id = ObjectId()
    listing_settled_id = ObjectId()
    listing_soybean_id = ObjectId()

    listings = [
        # Smallholder 1: Ramesh - 400 kg Onion (Under 500kg threshold alone)
        {
            "_id": listing_pool_1_id,
            "farmer_id": farmer_ramesh_id,
            "farmer_name": "Ramesh Patil",
            "crop": "onion",
            "variety": "Nashik Red",
            "quantity_kg": 400.0,
            "quantity_remaining_kg": 400.0,
            "ask_price_per_kg": 25.0,
            "min_acceptable_price_per_kg": 23.0,
            "quality_grade": "A",
            "confidence_score": 0.94,
            "needs_human_review": False,
            "status": "open",
            "location": users[0]['location'],
            "created_at": (now - timedelta(minutes=45)).isoformat(),
            "updated_at": now_iso
        },
        # Smallholder 2: Suresh - 350 kg Onion
        {
            "_id": listing_pool_2_id,
            "farmer_id": farmer_suresh_id,
            "farmer_name": "Suresh Deshmukh",
            "crop": "onion",
            "variety": "Nashik Red",
            "quantity_kg": 350.0,
            "quantity_remaining_kg": 350.0,
            "ask_price_per_kg": 24.5,
            "min_acceptable_price_per_kg": 22.5,
            "quality_grade": "A",
            "confidence_score": 0.91,
            "needs_human_review": False,
            "status": "open",
            "location": users[1]['location'],
            "created_at": (now - timedelta(minutes=30)).isoformat(),
            "updated_at": now_iso
        },
        # Smallholder 3: Santosh - 250 kg Onion (Combined total = 1000 kg!)
        {
            "_id": listing_pool_3_id,
            "farmer_id": farmer_santosh_id,
            "farmer_name": "Santosh Pawar",
            "crop": "onion",
            "variety": "Nashik Red",
            "quantity_kg": 250.0,
            "quantity_remaining_kg": 250.0,
            "ask_price_per_kg": 24.0,
            "min_acceptable_price_per_kg": 22.0,
            "quality_grade": "A",
            "confidence_score": 0.96,
            "needs_human_review": False,
            "status": "open",
            "location": users[2]['location'],
            "created_at": (now - timedelta(minutes=15)).isoformat(),
            "updated_at": now_iso
        },
        # Ambiguous AI Quality Listing -> Flags Admin Review Queue
        {
            "_id": listing_review_id,
            "farmer_id": farmer_ramesh_id,
            "farmer_name": "Ramesh Patil",
            "crop": "tomato",
            "variety": "Desi Red",
            "quantity_kg": 800.0,
            "quantity_remaining_kg": 800.0,
            "ask_price_per_kg": 28.0,
            "min_acceptable_price_per_kg": 25.0,
            "quality_grade": "B",
            "confidence_score": 0.58,
            "needs_human_review": True,
            "status": "open",
            "location": users[0]['location'],
            "created_at": (now - timedelta(hours=2)).isoformat(),
            "updated_at": now_iso
        },
        # Already Settled Listing (Demonstrating complete transaction loop)
        {
            "_id": listing_settled_id,
            "farmer_id": farmer_suresh_id,
            "farmer_name": "Suresh Deshmukh",
            "crop": "tomato",
            "variety": "Hybrid Vaishali",
            "quantity_kg": 2000.0,
            "quantity_remaining_kg": 0.0,
            "ask_price_per_kg": 30.0,
            "min_acceptable_price_per_kg": 28.0,
            "quality_grade": "B",
            "confidence_score": 0.88,
            "needs_human_review": False,
            "status": "settled",
            "location": users[1]['location'],
            "created_at": (now - timedelta(days=2)).isoformat(),
            "updated_at": (now - timedelta(days=1)).isoformat()
        },
        # Large Soybean Listing in Solapur
        {
            "_id": listing_soybean_id,
            "farmer_id": farmer_santosh_id,
            "farmer_name": "Santosh Pawar",
            "crop": "soybean",
            "variety": "JS-335",
            "quantity_kg": 1500.0,
            "quantity_remaining_kg": 0.0,
            "ask_price_per_kg": 44.0,
            "min_acceptable_price_per_kg": 42.0,
            "quality_grade": "A",
            "confidence_score": 0.95,
            "needs_human_review": False,
            "status": "pooled",
            "location": {"type": "Point", "geo": [75.9064, 17.6599], "address": "Solapur, Maharashtra"},
            "created_at": (now - timedelta(hours=5)).isoformat(),
            "updated_at": (now - timedelta(hours=1)).isoformat()
        }
    ]

    # 3. Pooled Batches
    batch_soybean_id = ObjectId()
    batch_settled_id = ObjectId()

    pooled_batches = [
        # Active Batch awaiting auction match
        {
            "_id": batch_soybean_id,
            "crop": "soybean",
            "quality_grade": "A",
            "total_quantity_kg": 1500.0,
            "available_quantity_kg": 1500.0,
            "weighted_ask_price_per_kg": 44.0,
            "min_clearing_price_per_kg": 42.0,
            "region": "Solapur",
            "status": "open",
            "listing_ids": [listing_soybean_id],
            "constituent_listings": [
                {
                    "listing_id": listing_soybean_id,
                    "farmer_id": farmer_santosh_id,
                    "farmer_name": "Santosh Pawar",
                    "quantity_kg": 1500.0,
                    "ask_price_per_kg": 44.0,
                    "min_price_per_kg": 42.0
                }
            ],
            "created_at": (now - timedelta(hours=1)).isoformat(),
            "updated_at": now_iso
        },
        # Settled Batch
        {
            "_id": batch_settled_id,
            "crop": "tomato",
            "quality_grade": "B",
            "total_quantity_kg": 2000.0,
            "available_quantity_kg": 0.0,
            "weighted_ask_price_per_kg": 30.0,
            "min_clearing_price_per_kg": 28.0,
            "region": "Nashik",
            "status": "settled",
            "listing_ids": [listing_settled_id],
            "constituent_listings": [
                {
                    "listing_id": listing_settled_id,
                    "farmer_id": farmer_suresh_id,
                    "farmer_name": "Suresh Deshmukh",
                    "quantity_kg": 2000.0,
                    "ask_price_per_kg": 30.0,
                    "min_price_per_kg": 28.0
                }
            ],
            "created_at": (now - timedelta(days=2)).isoformat(),
            "updated_at": (now - timedelta(days=1)).isoformat()
        }
    ]

    # 4. Buyer Bids
    bids = [
        # Active bid for the upcoming Onion batch
        {
            "_id": ObjectId(),
            "buyer_id": buyer_freshfarm_id,
            "buyer_name": "FreshFarm Retail Pvt Ltd",
            "crop": "onion",
            "quantity_needed_kg": 1000.0,
            "quantity_remaining_kg": 1000.0,
            "max_price_per_kg": 26.0,
            "min_quality_grade": "A",
            "status": "open",
            "created_at": (now - timedelta(hours=1)).isoformat(),
            "updated_at": now_iso
        },
        # Active bid for Soybean
        {
            "_id": ObjectId(),
            "buyer_id": buyer_mahaagri_id,
            "buyer_name": "MahaAgri Commodity Traders",
            "crop": "soybean",
            "quantity_needed_kg": 1500.0,
            "quantity_remaining_kg": 1500.0,
            "max_price_per_kg": 44.5,
            "min_quality_grade": "A",
            "status": "open",
            "created_at": (now - timedelta(minutes=40)).isoformat(),
            "updated_at": now_iso
        },
        # Matched bid for Tomato
        {
            "_id": ObjectId(),
            "buyer_id": buyer_freshfarm_id,
            "buyer_name": "FreshFarm Retail Pvt Ltd",
            "crop": "tomato",
            "quantity_needed_kg": 2000.0,
            "quantity_remaining_kg": 0.0,
            "max_price_per_kg": 31.0,
            "min_quality_grade": "B",
            "status": "matched",
            "created_at": (now - timedelta(days=2)).isoformat(),
            "updated_at": (now - timedelta(days=1)).isoformat()
        }
    ]

    # 5. Trades & Settlements
    trade_id = ObjectId()
    payment_id = ObjectId()
    settled_trades = [
        {
            "_id": trade_id,
            "crop": "tomato",
            "quality_grade": "B",
            "quantity_kg": 2000.0,
            "clearing_price_per_kg": 29.0,
            "total_amount": 58000.0,
            "buyer_id": buyer_freshfarm_id,
            "buyer_name": "FreshFarm Retail Pvt Ltd",
            "pooled_batch_id": batch_settled_id,
            "status": "settled",
            "payment_id": payment_id,
            "farmer_shares": [
                {
                    "farmer_id": farmer_suresh_id,
                    "farmer_name": "Suresh Deshmukh",
                    "quantity_kg": 2000.0,
                    "share_ratio": 1.0,
                    "payout_amount": 58000.0,
                    "status": "settled"
                }
            ],
            "created_at": (now - timedelta(days=1)).isoformat(),
            "settled_at": (now - timedelta(days=1, minutes=-15)).isoformat()
        }
    ]

    # 6. Payments
    payments = [
        {
            "_id": payment_id,
            "trade_id": trade_id,
            "buyer_id": buyer_freshfarm_id,
            "amount_inr": 58000.0,
            "amount_paise": 5800000,
            "currency": "INR",
            "razorpay_order_id": "order_demo_sih_settled_001",
            "razorpay_payment_id": "pay_demo_sih_settled_001",
            "status": "captured",
            "created_at": (now - timedelta(days=1)).isoformat(),
            "captured_at": (now - timedelta(days=1, minutes=-10)).isoformat(),
            "payouts_distributed": True,
            "farmer_payouts": [
                {
                    "farmer_id": farmer_suresh_id,
                    "farmer_name": "Suresh Deshmukh",
                    "gross_amount": 58000.0,
                    "platform_fee": 580.0,  # 1%
                    "net_payout": 57420.0,
                    "status": "credited",
                    "utr_ref": "UTR-KS-2026-98124"
                }
            ]
        }
    ]

    # 7. 30 Days of Historical Market Prices
    crops = ['onion', 'tomato', 'soybean', 'wheat']
    mandis = ['Lasalgaon', 'Pune', 'Solapur', 'Ahmednagar']
    prices = []

    for days_ago in range(30, -1, -1):
        dt = now - timedelta(days=days_ago)
        date_str = dt.strftime('%Y-%m-%d')
        for crop in crops:
            for mandi in mandis:
                base_price = {
                    'onion': 2100,
                    'tomato': 2600,
                    'soybean': 4200,
                    'wheat': 2250
                }[crop]
                variation = random.randint(-120, 140)
                modal = float(base_price + variation)
                prices.append({
                    "_id": ObjectId(),
                    "crop": crop,
                    "mandi_name": mandi,
                    "source": "Agmarknet",
                    "date": date_str,
                    "min_price_per_quintal": modal - 150.0,
                    "max_price_per_quintal": modal + 150.0,
                    "modal_price_per_quintal": modal,
                    "ingested_at": dt.isoformat()
                })

    # 8. Warehouses & Cold Storages across Maharashtra
    warehouses = [
        {
            "_id": ObjectId(),
            "name": "Maha State Warehousing Corp - Nashik Regional Hub",
            "type": "warehouse",
            "location": {"type": "Point", "geo": [73.7898, 19.9975], "address": "MIDC Ambad, Nashik, Maharashtra"},
            "capacity_tonnes": 8000.0,
            "available_capacity_tonnes": 3200.0,
            "crop_types_supported": ["onion", "wheat", "soybean", "maize"],
            "contact_phone": "0253-2384111",
            "rate_per_quintal_month": 35.0,
            "source": "MSWC Official"
        },
        {
            "_id": ObjectId(),
            "name": "Lasalgaon Agro Cold Storage & Logistics",
            "type": "cold_storage",
            "location": {"type": "Point", "geo": [74.2256, 20.1467], "address": "Lasalgaon APMC Road, Nashik"},
            "capacity_tonnes": 2500.0,
            "available_capacity_tonnes": 850.0,
            "crop_types_supported": ["onion", "tomato", "grapes"],
            "contact_phone": "02550-266200",
            "rate_per_quintal_month": 65.0,
            "source": "MSWC Official"
        },
        {
            "_id": ObjectId(),
            "name": "Pune Agribusiness Agro Logistics Center",
            "type": "warehouse",
            "location": {"type": "Point", "geo": [73.8567, 18.5204], "address": "Gultekdi Market Yard, Pune"},
            "capacity_tonnes": 6000.0,
            "available_capacity_tonnes": 1400.0,
            "crop_types_supported": ["onion", "tomato", "wheat"],
            "contact_phone": "020-24268000",
            "rate_per_quintal_month": 40.0,
            "source": "APMC Pune"
        },
        {
            "_id": ObjectId(),
            "name": "Western Maharashtra Solapur Silo Complex",
            "type": "silo",
            "location": {"type": "Point", "geo": [75.9064, 17.6599], "address": "Solapur Industrial Area, Solapur"},
            "capacity_tonnes": 15000.0,
            "available_capacity_tonnes": 6500.0,
            "crop_types_supported": ["soybean", "wheat", "pulses"],
            "contact_phone": "0217-2311222",
            "rate_per_quintal_month": 30.0,
            "source": "WDRA Certified"
        },
        {
            "_id": ObjectId(),
            "name": "Ahmednagar Kisan Cold Warehouse",
            "type": "cold_storage",
            "location": {"type": "Point", "geo": [74.7496, 19.0952], "address": "MIDC Nagapur, Ahmednagar"},
            "capacity_tonnes": 3000.0,
            "available_capacity_tonnes": 1200.0,
            "crop_types_supported": ["tomato", "onion", "fruits"],
            "contact_phone": "0241-2415500",
            "rate_per_quintal_month": 60.0,
            "source": "WDRA Certified"
        }
    ]

    return {
        "users": users,
        "produce_listings": listings,
        "pooled_batches": pooled_batches,
        "bids": bids,
        "trades": settled_trades,
        "payments": payments,
        "market_prices": prices,
        "warehouses": warehouses
    }


def export_fixtures_json(data):
    """Exports demo data fixtures to JSON for offline demo runs."""
    def serialize(obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, (datetime,)):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")

    with open(FIXTURES_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, default=serialize, indent=2)
    print(f"[+] Saved offline demo fixtures to: {FIXTURES_PATH}")


def main():
    parser = argparse.ArgumentParser(description="Seed database for KrishiSetu live demo.")
    parser.add_argument('--clean', action='store_true', help='Clear existing demo collections before seeding')
    parser.add_argument('--uri', type=str, default=None, help='Explicit MongoDB connection URI')
    parser.add_argument('--export-only', action='store_true', help='Export demo JSON fixtures without connecting to DB')
    args = parser.parse_args()

    print("=======================================================")
    print("[*] Krishi-Setu Demo Data Seeder (SIH 2026 / KS-SAND)")
    print("=======================================================")

    data = build_demo_dataset()
    export_fixtures_json(data)

    if args.export_only:
        print("[+] Finished --export-only. Exiting.")
        return

    db = None
    try:
        db = get_db(args.uri)
        print(f"[+] Connected to MongoDB: {db.name}")
    except (ServerSelectionTimeoutError, ConfigurationError, Exception) as exc:
        print(f"[!] Could not connect to live MongoDB instance: {exc}")
        print(f"[*] Offline fixture JSON is preserved at {FIXTURES_PATH}")
        print("[*] To seed a live MongoDB Atlas cluster, pass: python scripts/seed_db.py --uri '<mongodb_uri>'")
        return

    if args.clean:
        clear_db(db)

    print(f"Seeding {len(data['users'])} users...")
    db.users.insert_many(data['users'])

    print(f"Seeding {len(data['produce_listings'])} produce listings...")
    db.produce_listings.insert_many(data['produce_listings'])

    print(f"Seeding {len(data['pooled_batches'])} pooled batches...")
    db.pooled_batches.insert_many(data['pooled_batches'])

    print(f"Seeding {len(data['bids'])} bids...")
    db.bids.insert_many(data['bids'])

    print(f"Seeding {len(data['trades'])} trades...")
    db.trades.insert_many(data['trades'])

    print(f"Seeding {len(data['payments'])} payments...")
    db.payments.insert_many(data['payments'])

    print(f"Seeding {len(data['market_prices'])} market price records...")
    db.market_prices.insert_many(data['market_prices'])

    print(f"Seeding {len(data['warehouses'])} warehouses...")
    db.warehouses.insert_many(data['warehouses'])

    print("\n[OK] Database seeding complete.")
    print("-" * 55)
    print("DEMO CREDENTIALS (Password for all: demo123)")
    print("-" * 55)
    print("Farmers:")
    print("  * 9876543210 (Ramesh Patil - Niphad, Nashik)")
    print("  * 9876543211 (Suresh Deshmukh - Lasalgaon, Nashik)")
    print("  * 9876543212 (Santosh Pawar - Yeola, Nashik)")
    print("Buyers:")
    print("  * 9876543220 (FreshFarm Retail Pvt Ltd - Pune)")
    print("  * 9876543221 (MahaAgri Commodity Traders - Mumbai)")
    print("Admin:")
    print("  * 9000000000 (KrishiSetu Operations Admin)")
    print("-" * 55)



if __name__ == '__main__':
    main()