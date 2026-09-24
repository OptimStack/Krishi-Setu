from datetime import datetime, timezone
from bson import ObjectId
from app import extensions


class MarketPrice:
    collection = 'market_prices'

    @staticmethod
    def create(data):
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            'crop': data['crop'],
            'mandi_name': data.get('mandi_name', 'Nashik'),
            'source': data.get('source', 'enam'),  # enam | agmarknet | msamb | data_gov_in
            'date': data['date'],
            'min_price_per_quintal': float(data.get('min_price_per_quintal', 0)),
            'max_price_per_quintal': float(data.get('max_price_per_quintal', 0)),
            'modal_price_per_quintal': float(data['modal_price_per_quintal']),
            'ingested_at': data.get('ingested_at', now),
        }
        result = extensions.db.market_prices.insert_one(doc)
        doc['_id'] = result.inserted_id
        return doc

    @staticmethod
    def bulk_insert(records):
        if records:
            now = datetime.now(timezone.utc).isoformat()
            prepared = []
            for r in records:
                doc = {
                    'crop': r['crop'],
                    'mandi_name': r.get('mandi_name', 'Nashik'),
                    'source': r.get('source', 'enam'),
                    'date': str(r['date']),
                    'min_price_per_quintal': float(r.get('min_price_per_quintal', 0)),
                    'max_price_per_quintal': float(r.get('max_price_per_quintal', 0)),
                    'modal_price_per_quintal': float(r['modal_price_per_quintal']),
                    'ingested_at': r.get('ingested_at', now),
                }
                prepared.append(doc)
            return extensions.db.market_prices.insert_many(prepared)
        return None

    @staticmethod
    def find_latest(crop, mandi_name=None, limit=30):
        query = {'crop': crop}
        if mandi_name:
            query['mandi_name'] = mandi_name
        return list(extensions.db.market_prices.find(query).sort('date', -1).limit(limit))

    @staticmethod
    def find_by_date_range(crop, start_date, end_date, mandi_name=None):
        query = {'crop': crop, 'date': {'$gte': str(start_date), '$lte': str(end_date)}}
        if mandi_name:
            query['mandi_name'] = mandi_name
        return list(extensions.db.market_prices.find(query).sort('date', 1))

    @staticmethod
    def get_recent_moving_average(crop, mandi_name=None, days=7):
        """
        Calculates moving average of recent modal prices.
        Used as Section 10 Edge Case 5 fallback when forecasting model has insufficient data.
        """
        query = {'crop': crop}
        if mandi_name:
            query['mandi_name'] = mandi_name
        recent = list(extensions.db.market_prices.find(query).sort('date', -1).limit(days))
        if not recent:
            # Fallback to crop-wide average if specific mandi has no data
            if mandi_name:
                recent = list(extensions.db.market_prices.find({'crop': crop}).sort('date', -1).limit(days))
        if not recent:
            return None

        prices = [r['modal_price_per_quintal'] for r in recent if 'modal_price_per_quintal' in r]
        if not prices:
            return None
        return round(float(sum(prices) / len(prices)), 2)

    @staticmethod
    def get_distinct_crops():
        return extensions.db.market_prices.distinct('crop')

    @staticmethod
    def get_distinct_mandis(crop=None):
        query = {'crop': crop} if crop else {}
        return extensions.db.market_prices.distinct('mandi_name', query)

    @staticmethod
    def count(query=None):
        return extensions.db.market_prices.count_documents(query or {})

    @staticmethod
    def delete(price_id):
        if not isinstance(price_id, ObjectId):
            price_id = ObjectId(str(price_id))
        return extensions.db.market_prices.delete_one({'_id': price_id})
