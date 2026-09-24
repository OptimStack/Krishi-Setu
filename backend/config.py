import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    TESTING = os.environ.get('TESTING', 'False').lower() in ('true', '1')
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/krishisetu')
    MONGODB_DB_NAME = os.environ.get('MONGODB_DB_NAME', 'krishisetu')
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')
    RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET')
    AUCTION_BATCH_INTERVAL_MINUTES = int(os.environ.get('AUCTION_BATCH_INTERVAL_MINUTES', '15'))
    POOLING_MIN_QUANTITY_KG = float(os.environ.get('POOLING_MIN_QUANTITY_KG', '500'))
    POOLING_MAX_WAIT_MINUTES = int(os.environ.get('POOLING_MAX_WAIT_MINUTES', '60'))
    GRADING_CONFIDENCE_THRESHOLD = float(os.environ.get('GRADING_CONFIDENCE_THRESHOLD', '0.7'))
    CORS_ALLOWED_ORIGIN = os.environ.get('CORS_ALLOWED_ORIGIN', 'http://localhost:5173')
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
