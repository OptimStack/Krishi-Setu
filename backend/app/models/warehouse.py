import math
from bson import ObjectId
from datetime import datetime, timezone
from app import extensions


def _haversine_km(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _extract_coords(warehouse_doc):
    """Extracts [lng, lat] from various GeoJSON/document layouts."""
    loc = warehouse_doc.get("location", {})
    if isinstance(loc, dict):
        if "geo" in loc:
            geo = loc["geo"]
            if isinstance(geo, dict) and "coordinates" in geo:
                coords = geo["coordinates"]
                return float(coords[0]), float(coords[1])
            elif isinstance(geo, list) and len(geo) >= 2:
                return float(geo[0]), float(geo[1])
        if "coordinates" in loc:
            coords = loc["coordinates"]
            return float(coords[0]), float(coords[1])
    return None, None


class Warehouse:
    collection = "warehouses"

    @staticmethod
    def create(data):
        now = datetime.now(timezone.utc).isoformat()
        coords = data.get("coordinates")
        loc = data.get("location", {})
        if coords and isinstance(coords, (list, tuple)) and len(coords) >= 2:
            geo_obj = {"type": "Point", "coordinates": [float(coords[0]), float(coords[1])]}
        elif isinstance(loc, dict) and "geo" in loc:
            geo_obj = loc["geo"]
        elif isinstance(loc, dict) and "coordinates" in loc:
            geo_obj = loc
        else:
            geo_obj = {"type": "Point", "coordinates": [73.7898, 19.9975]}

        doc = {
            "name": str(data["name"]).strip(),
            "type": data.get("type", "warehouse"),  # warehouse | silo | cold_storage
            "location": {
                "geo": geo_obj,
                "address": data.get("address", ""),
                "district": data.get("district", "Nashik"),
                "state": data.get("state", "Maharashtra"),
            },
            "capacity_tonnes": float(data.get("capacity_tonnes", 1000.0)),
            "crop_types_supported": [c.strip() for c in data.get("crop_types_supported", [])],
            "contact_phone": str(data.get("contact_phone", "")).strip(),
            "source": data.get("source", "mswc_official"),
            "created_at": now,
        }
        result = extensions.db.warehouses.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    @staticmethod
    def bulk_insert(docs):
        if docs:
            return extensions.db.warehouses.insert_many(docs)
        return None

    @staticmethod
    def find_by_id(warehouse_id):
        try:
            return extensions.db.warehouses.find_one({"_id": ObjectId(str(warehouse_id))})
        except Exception:
            return None

    @staticmethod
    def find_nearby(lng: float, lat: float, max_distance_km: float = 100.0, crop: str = None, warehouse_type: str = None, limit: int = 20):
        """
        Finds warehouses within max_distance_km sorted strictly by distance ascending.
        Works across both MongoDB 2dsphere index and mongomock via Haversine calculation.
        """
        query = {}
        if warehouse_type and warehouse_type != "all":
            query["type"] = warehouse_type

        # Fetch candidate facilities
        candidates = list(extensions.db.warehouses.find(query))
        results = []

        for w in candidates:
            # Crop compatibility filter (case-insensitive)
            if crop and crop.lower() != "all":
                supported = [c.lower() for c in w.get("crop_types_supported", [])]
                if supported and crop.lower() not in supported:
                    continue

            w_lng, w_lat = _extract_coords(w)
            if w_lng is None or w_lat is None:
                continue

            dist = _haversine_km(lat, lng, w_lat, w_lng)
            if dist <= max_distance_km:
                item = dict(w)
                item["distance_km"] = round(dist, 2)
                item["distance_text"] = f"{dist:.1f} km away" if dist >= 0.1 else "Nearby (< 100m)"
                results.append(item)

        # Sort by distance ascending
        results.sort(key=lambda x: x["distance_km"])
        return results[:limit]

    @staticmethod
    def find_all(query=None, limit=100):
        return list(extensions.db.warehouses.find(query or {}).limit(limit))

    @staticmethod
    def count(query=None):
        return extensions.db.warehouses.count_documents(query or {})

    @staticmethod
    def delete(warehouse_id):
        try:
            return extensions.db.warehouses.delete_one({"_id": ObjectId(str(warehouse_id))})
        except Exception:
            return None
