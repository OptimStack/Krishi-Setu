import os
import sys
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from apscheduler.schedulers.background import BackgroundScheduler
import razorpay

logger = logging.getLogger(__name__)

mongo_client = None
db = None
scheduler = BackgroundScheduler()
razorpay_client = None


def init_extensions(app):
    global mongo_client, db, razorpay_client

    if app.config.get('TESTING') and db is not None:
        return

    # --- MongoDB: fail fast if unreachable ---
    mongo_uri = app.config.get('MONGODB_URI')
    db_name = app.config.get('MONGODB_DB_NAME', 'krishisetu')

    if not mongo_uri:
        try:
            import mongomock
            mongo_client = mongomock.MongoClient()
            db = mongo_client[db_name]
            logger.info('Using mongomock client fallback (no MONGODB_URI)')
            return
        except ImportError:
            pass
        if not app.config.get('TESTING') and not os.environ.get('VERCEL'):
            logger.critical('MONGODB_URI is not set. Cannot start.')
            sys.exit(1)
        return

    try:
        mongo_client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=2000 if app.config.get('TESTING') else 5000,
            connectTimeoutMS=2000 if app.config.get('TESTING') else 5000,
        )
        # Force a connection attempt so failures are immediate, not lazy
        mongo_client.admin.command('ping')
        db = mongo_client[db_name]
        logger.info('MongoDB connected: %s / %s', mongo_uri.split('@')[-1] if '@' in mongo_uri else 'localhost', db_name)
    except Exception as exc:
        logger.warning('MongoDB connection failed: %s', exc)
        try:
            import mongomock
            logger.info('Using mongomock client fallback')
            mongo_client = mongomock.MongoClient()
            db = mongo_client[db_name]
            return
        except ImportError:
            pass
        if not app.config.get('TESTING') and not os.environ.get('VERCEL'):
            logger.critical('MongoDB connection failed: %s', exc)
            sys.exit(1)

    # --- Razorpay (optional — test mode keys may be absent early) ---
    key_id = app.config.get('RAZORPAY_KEY_ID')
    key_secret = app.config.get('RAZORPAY_KEY_SECRET')
    if key_id and key_secret:
        razorpay_client = razorpay.Client(auth=(key_id, key_secret))
        logger.info('Razorpay client initialized')
    else:
        logger.warning('Razorpay keys not set — payment endpoints will fail')

    # --- APScheduler ---
    if not app.config.get('TESTING') and not os.environ.get('VERCEL'):
        try:
            from app.auction_engine.batch_scheduler import schedule_jobs
            schedule_jobs(scheduler, app)
            if not scheduler.running:
                scheduler.start()
                logger.info('APScheduler started with double-auction jobs')
        except Exception as exc:
            logger.warning('Failed to initialize auction scheduler jobs: %s', exc)
