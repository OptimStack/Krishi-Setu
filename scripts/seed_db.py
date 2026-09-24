"""Seed the MongoDB database with realistic demo data for Maharashtra.

Usage:
    cd backend && python -m scripts.seed_db [--clean]
    # or from project root:
    python scripts/seed_db.py [--clean]
"""
import os
import argparse
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
from bson.objectid import ObjectId

# Load env from backend/.env
env_path = Path(__file__).resolve().parent.parent / 'backend' / '.env'
load_dotenv(env_path)

MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu')
DB_NAME = os.environ.get('MONGODB_DB_NAME', 'krishisetu')

def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return client[DB_NAME]

def clear_db(db):
    print("Clearing existing data...")
    collections = ['users', 'produce_listings', 'bids', 'market_prices', 'warehouses']
    for coll in collections:
        db[coll].delete_many({})
    print("Database cleared.")

def seed_users(db):
    print("Seeding users...")
    password = generate_password_hash('demo123')
    now = datetime.now(timezone.utc).isoformat()
    
    users = [
        # Farmers
        {
            "_id": ObjectId(),
            "role": "farmer",
            "name": "Ramesh Patil",
            "phone": "9876543210",
            "password_hash": password,
            "location": {"type": "Point", "geo": [73.7898, 19.9975], "address": "Nashik, Maharashtra"}, # Nashik
            "kyc_verified": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "role": "farmer",
            "name": "Suresh Deshmukh",
            "phone": "9876543211",
            "password_hash": password,
            "location": {"type": "Point", "geo": [74.7496, 19.0952], "address": "Ahmednagar, Maharashtra"}, # Ahmednagar
            "kyc_verified": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "role": "farmer",
            "name": "Santosh Pawar",
            "phone": "9876543212",
            "password_hash": password,
            "location": {"type": "Point", "geo": [75.9064, 17.6599], "address": "Solapur, Maharashtra"}, # Solapur
            "kyc_verified": True,
            "created_at": now,
            "updated_at": now
        },
        # Buyers
        {
            "_id": ObjectId(),
            "role": "buyer",
            "name": "FreshFarm Retail",
            "phone": "9876543220",
            "password_hash": password,
            "location": {"type": "Point", "geo": [73.8567, 18.5204], "address": "Pune, Maharashtra"}, # Pune
            "kyc_verified": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "role": "buyer",
            "name": "MahaAgri Traders",
            "phone": "9876543221",
            "password_hash": password,
            "location": {"type": "Point", "geo": [72.8777, 19.0760], "address": "Mumbai, Maharashtra"}, # Mumbai
            "kyc_verified": True,
            "created_at": now,
            "updated_at": now
        },
        # Admin
        {
            "_id": ObjectId(),
            "role": "admin",
            "name": "KrishiSetu Admin",
            "phone": "9000000000",
            "password_hash": password,
            "location": {"type": "Point", "geo": [73.8567, 18.5204], "address": "Pune, Maharashtra"},
            "kyc_verified": True,
            "created_at": now,
            "updated_at": now
        }
    ]
    
    db.users.insert_many(users)
    print(f"  Inserted {len(users)} users.")
    return users

def seed_listings(db, users):
    print("Seeding produce listings...")
    now = datetime.now(timezone.utc).isoformat()
    farmers = [u for u in users if u['role'] == 'farmer']
    
    listings = [
        {
            "farmer_id": farmers[0]['_id'],
            "crop": "onion",
            "variety": "Nashik Red",
            "quantity_kg": 5000.0,
            "quantity_remaining_kg": 5000.0,
            "ask_price_per_kg": 25.0,
            "min_acceptable_price_per_kg": 22.0,
            "quality_grade": "A",
            "status": "open",
            "location": farmers[0]['location'],
            "created_at": now,
            "updated_at": now
        },
        {
            "farmer_id": farmers[1]['_id'],
            "crop": "tomato",
            "variety": "Hybrid",
            "quantity_kg": 2000.0,
            "quantity_remaining_kg": 2000.0,
            "ask_price_per_kg": 30.0,
            "min_acceptable_price_per_kg": 28.0,
            "quality_grade": "B",
            "status": "open",
            "location": farmers[1]['location'],
            "created_at": now,
            "updated_at": now
        },
        {
            "farmer_id": farmers[2]['_id'],
            "crop": "soybean",
            "variety": "JS 335",
            "quantity_kg": 10000.0,
            "quantity_remaining_kg": 10000.0,
            "ask_price_per_kg": 45.0,
            "min_acceptable_price_per_kg": 40.0,
            "quality_grade": "A",
            "status": "open",
            "location": farmers[2]['location'],
            "created_at": now,
            "updated_at": now
        }
    ]
    
    db.produce_listings.insert_many(listings)
    print(f"  Inserted {len(listings)} listings.")

def seed_bids(db, users):
    print("Seeding bids...")
    now = datetime.now(timezone.utc).isoformat()
    buyers = [u for u in users if u['role'] == 'buyer']
    
    bids = [
        {
            "buyer_id": buyers[0]['_id'],
            "crop": "onion",
            "quantity_needed_kg": 2000.0,
            "quantity_remaining_kg": 2000.0,
            "max_price_per_kg": 24.0,
            "min_quality_grade": "B",
            "status": "open",
            "created_at": now,
            "updated_at": now
        },
        {
            "buyer_id": buyers[1]['_id'],
            "crop": "soybean",
            "quantity_needed_kg": 5000.0,
            "quantity_remaining_kg": 5000.0,
            "max_price_per_kg": 42.0,
            "min_quality_grade": "A",
            "status": "open",
            "created_at": now,
            "updated_at": now
        }
    ]
    
    db.bids.insert_many(bids)
    print(f"  Inserted {len(bids)} bids.")

def seed_market_prices(db):
    print("Seeding market prices...")
    now = datetime.now(timezone.utc)
    crops = ['onion', 'tomato', 'soybean', 'wheat']
    mandis = ['Lasalgaon', 'Pune', 'Solapur', 'Ahmednagar']
    
    prices = []
    for days_ago in range(30, -1, -1):
        dt = now - timedelta(days=days_ago)
        date_str = dt.strftime('%Y-%m-%d')
        
        for crop in crops:
            for mandi in mandis:
                base_price = {
                    'onion': 2000,
                    'tomato': 2500,
                    'soybean': 4000,
                    'wheat': 2200
                }[crop]
                
                variation = random.randint(-200, 200)
                modal_price = base_price + variation
                
                prices.append({
                    "crop": crop,
                    "mandi_name": mandi,
                    "source": "enam",
                    "date": date_str,
                    "min_price_per_quintal": modal_price - 200.0,
                    "max_price_per_quintal": modal_price + 200.0,
                    "modal_price_per_quintal": float(modal_price),
                    "ingested_at": dt.isoformat()
                })
                
    db.market_prices.insert_many(prices)
    print(f"  Inserted {len(prices)} market price records.")

def seed_warehouses(db):
    print("Seeding warehouses...")
    warehouses = [
        {
            "name": "Maha State Warehousing Corp - Nashik",
            "type": "warehouse",
            "location": {"type": "Point", "geo": [73.7898, 19.9975], "address": "Nashik, Maharashtra"},
            "capacity_tonnes": 5000.0,
            "crop_types_supported": ["onion", "wheat", "soybean"],
            "contact_phone": "1800111222",
            "source": "manual"
        },
        {
            "name": "Pune Cold Storage Co.",
            "type": "cold_storage",
            "location": {"type": "Point", "geo": [73.8567, 18.5204], "address": "Pune, Maharashtra"},
            "capacity_tonnes": 1000.0,
            "crop_types_supported": ["tomato", "onion"],
            "contact_phone": "1800333444",
            "source": "manual"
        }
    ]
    
    db.warehouses.insert_many(warehouses)
    print(f"  Inserted {len(warehouses)} warehouses.")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--clean', action='store_true', help='Clear existing demo data')
    args = parser.parse_args()
    
    print(f"Connecting to MongoDB: {DB_NAME}...")
    db = get_db()
    
    if args.clean:
        clear_db(db)
        
    users = seed_users(db)
    seed_listings(db, users)
    seed_bids(db, users)
    seed_market_prices(db)
    seed_warehouses(db)
    
    print("\n✅ Database seeding complete.")
    print("-" * 40)
    print("Demo Accounts (Password for all: demo123)")
    print("-" * 40)
    print("Farmers:")
    for u in users:
        if u['role'] == 'farmer':
            print(f"  {u['phone']} - {u['name']}")
    print("Buyers:")
    for u in users:
        if u['role'] == 'buyer':
            print(f"  {u['phone']} - {u['name']}")
    print("Admin:")
    for u in users:
        if u['role'] == 'admin':
            print(f"  {u['phone']} - {u['name']}")

if __name__ == '__main__':
    main()