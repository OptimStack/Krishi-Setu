import os

root = r"e:\KrishiSetu"

files = {
    r"backend\requirements.txt": """Flask==3.0.3
Flask-JWT-Extended==4.6.0
Flask-Cors==4.0.0
pymongo==4.6.3
python-dotenv==1.0.1
APScheduler==3.10.4
razorpay==1.4.1
numpy
pandas
scikit-learn
pytest
requests
""",
    r"backend\.env.example": """FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
MONGO_URI=mongodb://localhost:27017/krishisetu
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
""",
    r"backend\config.py": """import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt')
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/krishisetu')
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')
""",
    r"backend\run.py": """from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
""",
    r"backend\app\__init__.py": """from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from .extensions import init_extensions

def create_app(config_class='config.Config'):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app)
    JWTManager(app)
    
    init_extensions(app)

    # Register blueprints
    from .auth.routes import auth_bp
    from .farmer.routes import farmer_bp
    from .buyer.routes import buyer_bp
    from .admin.routes import admin_bp
    from .ml_testing.routes import ml_bp
    from .payments.routes import payments_bp
    from .market_data.routes import market_bp
    from .warehouse.routes import warehouse_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(farmer_bp, url_prefix='/api/farmer')
    app.register_blueprint(buyer_bp, url_prefix='/api/buyer')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(ml_bp, url_prefix='/api/ml')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(market_bp, url_prefix='/api/market')
    app.register_blueprint(warehouse_bp, url_prefix='/api/warehouse')

    return app
""",
    r"backend\app\extensions.py": """from pymongo import MongoClient
from apscheduler.schedulers.background import BackgroundScheduler
import razorpay

mongo_client = None
db = None
scheduler = BackgroundScheduler()
razorpay_client = None

def init_extensions(app):
    global mongo_client, db, razorpay_client
    mongo_client = MongoClient(app.config['MONGO_URI'])
    db = mongo_client.get_database()
    
    key_id = app.config.get('RAZORPAY_KEY_ID')
    key_secret = app.config.get('RAZORPAY_KEY_SECRET')
    if key_id and key_secret:
        razorpay_client = razorpay.Client(auth=(key_id, key_secret))
        
    if not scheduler.running:
        scheduler.start()
""",
    r"backend\app\utils\__init__.py": "",
    r"backend\app\utils\logger.py": """import logging

def get_logger(name):
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
""",
    r"backend\app\utils\validators.py": """def validate_required(data, required_fields):
    missing = [f for f in required_fields if f not in data]
    if missing:
        return False, f"Missing fields: {', '.join(missing)}"
    return True, None
""",
    r"backend\app\utils\decorators.py": """from functools import wraps
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask import jsonify

def role_required(*roles):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"data": None, "error": {"code": "FORBIDDEN", "message": "Insufficient permissions"}}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper
""",
    r"backend\app\utils\geo.py": """import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
""",
    r"backend\app\models\__init__.py": "",
    r"backend\app\models\user.py": """from app.extensions import db
from bson import ObjectId

class User:
    @staticmethod
    def create(data):
        return db.users.insert_one(data)
    
    @staticmethod
    def find_by_email(email):
        return db.users.find_one({"email": email})
        
    @staticmethod
    def find_by_id(user_id):
        return db.users.find_one({"_id": ObjectId(user_id)})
""",
    r"backend\app\models\produce_listing.py": """from app.extensions import db
from bson import ObjectId

class ProduceListing:
    @staticmethod
    def create(data):
        return db.produce_listings.insert_one(data)
        
    @staticmethod
    def find_all():
        return list(db.produce_listings.find())
        
    @staticmethod
    def find_by_farmer(farmer_id):
        return list(db.produce_listings.find({"farmer_id": farmer_id}))
""",
    r"backend\app\models\bid.py": """from app.extensions import db
from bson import ObjectId

class Bid:
    @staticmethod
    def create(data):
        return db.bids.insert_one(data)
        
    @staticmethod
    def find_by_buyer(buyer_id):
        return list(db.bids.find({"buyer_id": buyer_id}))
        
    @staticmethod
    def find_active_bids(batch_id):
        return list(db.bids.find({"batch_id": batch_id, "status": "active"}))
""",
    r"backend\app\models\pooled_batch.py": """from app.extensions import db

class PooledBatch:
    @staticmethod
    def create(data):
        return db.pooled_batches.insert_one(data)
""",
    r"backend\app\models\auction_round.py": """from app.extensions import db

class AuctionRound:
    @staticmethod
    def create(data):
        return db.auction_rounds.insert_one(data)
""",
    r"backend\app\models\trade.py": """from app.extensions import db

class Trade:
    @staticmethod
    def create(data):
        return db.trades.insert_one(data)
""",
    r"backend\app\models\payment.py": """from app.extensions import db

class Payment:
    @staticmethod
    def create(data):
        return db.payments.insert_one(data)
""",
    r"backend\app\models\market_price.py": """from app.extensions import db

class MarketPrice:
    @staticmethod
    def create(data):
        return db.market_prices.insert_one(data)
        
    @staticmethod
    def get_latest(commodity):
        return list(db.market_prices.find({"commodity": commodity}).sort("date", -1).limit(10))
""",
    r"backend\app\models\grading_record.py": """from app.extensions import db

class GradingRecord:
    @staticmethod
    def create(data):
        return db.grading_records.insert_one(data)
""",
    r"backend\app\models\warehouse.py": """from app.extensions import db

class Warehouse:
    @staticmethod
    def find_all():
        return list(db.warehouses.find())
""",
    r"backend\app\auth\__init__.py": "",
    r"backend\app\auth\utils.py": """import hashlib
import os
from flask_jwt_extended import create_access_token

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain, hashed):
    return hash_password(plain) == hashed
    
def generate_token(user_id, role):
    return create_access_token(identity=str(user_id), additional_claims={"role": role})
""",
    r"backend\app\auth\routes.py": """from flask import Blueprint, request, jsonify
from .utils import hash_password, verify_password, generate_token
from app.models.user import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.find_by_email(data.get('email')):
        return jsonify({"data": None, "error": {"code": "EXISTS", "message": "Email already registered"}}), 400
        
    data['password'] = hash_password(data['password'])
    res = User.create(data)
    return jsonify({"data": {"user_id": str(res.inserted_id)}, "error": None})

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.find_by_email(data.get('email'))
    if not user or not verify_password(data.get('password'), user['password']):
        return jsonify({"data": None, "error": {"code": "INVALID", "message": "Invalid credentials"}}), 401
        
    token = generate_token(user['_id'], user.get('role', 'farmer'))
    return jsonify({"data": {"token": token, "role": user.get('role', 'farmer')}, "error": None})
""",
    r"backend\app\farmer\__init__.py": "",
    r"backend\app\farmer\routes.py": """from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorators import role_required
from app.models.produce_listing import ProduceListing

farmer_bp = Blueprint('farmer', __name__)

@farmer_bp.route('/listings', methods=['GET', 'POST'])
@jwt_required()
@role_required('farmer')
def listings():
    farmer_id = get_jwt_identity()
    if request.method == 'POST':
        data = request.json
        data['farmer_id'] = farmer_id
        res = ProduceListing.create(data)
        return jsonify({"data": {"id": str(res.inserted_id)}, "error": None})
        
    items = ProduceListing.find_by_farmer(farmer_id)
    for i in items: i['_id'] = str(i['_id'])
    return jsonify({"data": items, "error": None})
""",
    r"backend\app\buyer\__init__.py": "",
    r"backend\app\buyer\routes.py": """from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorators import role_required
from app.models.bid import Bid

buyer_bp = Blueprint('buyer', __name__)

@buyer_bp.route('/bids', methods=['GET', 'POST'])
@jwt_required()
@role_required('buyer')
def bids():
    buyer_id = get_jwt_identity()
    if request.method == 'POST':
        data = request.json
        data['buyer_id'] = buyer_id
        res = Bid.create(data)
        return jsonify({"data": {"id": str(res.inserted_id)}, "error": None})
        
    items = Bid.find_by_buyer(buyer_id)
    for i in items: i['_id'] = str(i['_id'])
    return jsonify({"data": items, "error": None})
""",
    r"backend\app\admin\__init__.py": "",
    r"backend\app\admin\routes.py": """from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.utils.decorators import role_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/auctions', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_auctions():
    return jsonify({"data": [], "error": None})
""",
    r"backend\app\auction_engine\__init__.py": "",
    r"backend\app\auction_engine\matcher.py": """def clear_auction(asks, bids):
    asks.sort(key=lambda x: x['price'])
    bids.sort(key=lambda x: x['price'], reverse=True)
    
    trades = []
    i, j = 0, 0
    while i < len(asks) and j < len(bids):
        if bids[j]['price'] >= asks[i]['price']:
            clearing_price = (bids[j]['price'] + asks[i]['price']) / 2.0
            vol = min(asks[i]['quantity'], bids[j]['quantity'])
            trades.append({
                'ask_id': asks[i]['id'],
                'bid_id': bids[j]['id'],
                'price': clearing_price,
                'quantity': vol
            })
            asks[i]['quantity'] -= vol
            bids[j]['quantity'] -= vol
            if asks[i]['quantity'] == 0: i += 1
            if bids[j]['quantity'] == 0: j += 1
        else:
            break
    return trades
""",
    r"backend\app\auction_engine\pooling.py": """def pool_produce(listings, target_grade):
    pooled = []
    for l in listings:
        if l['grade'] == target_grade:
            pooled.append(l)
    return pooled
""",
    r"backend\app\auction_engine\batch_scheduler.py": """from app.extensions import scheduler

def run_auction_batch():
    print("Running auction batch...")
    
def schedule_jobs():
    scheduler.add_job(run_auction_batch, 'interval', hours=1)
""",
    r"backend\app\auction_engine\settlement_trigger.py": """def trigger_settlement(trades):
    print(f"Settling {len(trades)} trades")
""",
    r"backend\app\grading\__init__.py": "",
    r"backend\app\grading\model_loader.py": """def load_model():
    return "DummyModel"
""",
    r"backend\app\grading\infer.py": """def infer_grade(image_path):
    return {"grade": "A", "confidence": 0.95}
""",
    r"backend\app\grading\review_queue.py": """def enqueue_review(image_id):
    pass
""",
    r"backend\app\price_forecast\__init__.py": "",
    r"backend\app\price_forecast\train.py": """def train_model():
    pass
""",
    r"backend\app\price_forecast\model.py": """class PriceForecastModel:
    def predict(self, date, commodity):
        return 100.0
""",
    r"backend\app\price_forecast\predict.py": """from .model import PriceForecastModel
def get_prediction(date, commodity):
    return PriceForecastModel().predict(date, commodity)
""",
    r"backend\app\ml_testing\__init__.py": "",
    r"backend\app\ml_testing\routes.py": """from flask import Blueprint, jsonify

ml_bp = Blueprint('ml', __name__)

@ml_bp.route('/predict-price', methods=['GET'])
def predict_price():
    return jsonify({"data": {"price": 120.5}, "error": None})
""",
    r"backend\app\payments\__init__.py": "",
    r"backend\app\payments\razorpay_client.py": """from app.extensions import razorpay_client

def create_order(amount, receipt):
    if razorpay_client:
        return razorpay_client.order.create({"amount": amount*100, "currency": "INR", "receipt": receipt})
    return {"id": "dummy_order_id"}
""",
    r"backend\app\payments\routes.py": """from flask import Blueprint, jsonify
payments_bp = Blueprint('payments', __name__)

@payments_bp.route('/create-order', methods=['POST'])
def create():
    return jsonify({"data": {"order_id": "dummy_order_id"}, "error": None})
""",
    r"backend\app\payments\payout_split.py": """def calculate_splits(total_amount, contributors):
    return {c['farmer_id']: (c['quantity'] / sum(x['quantity'] for x in contributors)) * total_amount for c in contributors}
""",
    r"backend\app\market_data\__init__.py": "",
    r"backend\app\market_data\ingest.py": """def ingest_data():
    pass
""",
    r"backend\app\market_data\routes.py": """from flask import Blueprint, jsonify
from app.models.market_price import MarketPrice

market_bp = Blueprint('market', __name__)

@market_bp.route('/prices', methods=['GET'])
def get_prices():
    return jsonify({"data": [], "error": None})
""",
    r"backend\app\market_data\sources\__init__.py": "",
    r"backend\app\market_data\sources\enam.py": """def fetch_enam():
    pass
""",
    r"backend\app\market_data\sources\agmarknet.py": """def fetch_agmarknet():
    pass
""",
    r"backend\app\market_data\sources\data_gov_in.py": """def fetch_data_gov():
    pass
""",
    r"backend\app\warehouse\__init__.py": "",
    r"backend\app\warehouse\routes.py": """from flask import Blueprint, jsonify
warehouse_bp = Blueprint('warehouse', __name__)

@warehouse_bp.route('/nearby', methods=['GET'])
def nearby():
    return jsonify({"data": [], "error": None})
""",
    r"backend\uploads\.gitkeep": "",
    r"scripts\seed_db.py": """print("Seeding DB...")""",
    r"scripts\run_batch_auction_cli.py": """print("Running batch auction...")""",
    r"tests\backend\__init__.py": "",
    r"tests\backend\test_auth.py": """def test_dummy():
    assert True
""",
    r"tests\backend\test_auction_engine.py": """def test_dummy():
    assert True
""",
    r"tests\backend\test_pooling.py": """def test_dummy():
    assert True
""",
    r"tests\backend\test_payments.py": """def test_dummy():
    assert True
""",
    r"tests\backend\test_grading.py": """def test_dummy():
    assert True
""",
    r"tests\backend\test_price_forecast.py": """def test_dummy():
    assert True
"""
}

for rel_path, content in files.items():
    full_path = os.path.join(root, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
print("Files created.")
