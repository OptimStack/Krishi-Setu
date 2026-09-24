import math
import logging
from datetime import datetime, timezone
from bson import ObjectId
from flask import current_app

from app import extensions

logger = logging.getLogger(__name__)

# Default constants (fallback if config is unavailable)
DEFAULT_MIN_QUANTITY_KG = 500.0
DEFAULT_MAX_WAIT_MINUTES = 60
DEFAULT_MAX_DISTANCE_KM = 50.0


def haversine_distance_km(coord1, coord2):
    """
    Calculate the great-circle distance between two (lat, lng) points on Earth in kilometers.
    """
    if not coord1 or not coord2:
        return float('inf')
    lat1, lon1 = coord1
    lat2, lon2 = coord2

    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def extract_location_info(listing):
    """
    Extract (lat, lng) and region string from listing location.
    Handles GeoJSON points, lat/lng dicts, and district/state dicts.
    """
    loc = listing.get('location') or {}
    coords = None
    region = 'General'

    if isinstance(loc, dict):
        district = loc.get('district') or loc.get('city') or loc.get('address') or loc.get('region')
        state = loc.get('state') or 'Maharashtra'
        if district:
            region = f"{district}, {state}" if state and district != state else str(district)

        # 1. GeoJSON format: {"type": "Point", "coordinates": [lng, lat]}
        if 'coordinates' in loc and isinstance(loc['coordinates'], (list, tuple)) and len(loc['coordinates']) >= 2:
            try:
                coords = (float(loc['coordinates'][1]), float(loc['coordinates'][0]))
            except (ValueError, TypeError):
                pass
        # 2. Nested geo dict: {"geo": {"coordinates": [lng, lat]}} or {"geo": [lng, lat]}
        elif 'geo' in loc:
            geo = loc['geo']
            if isinstance(geo, dict) and 'coordinates' in geo and len(geo['coordinates']) >= 2:
                try:
                    coords = (float(geo['coordinates'][1]), float(geo['coordinates'][0]))
                except (ValueError, TypeError):
                    pass
            elif isinstance(geo, (list, tuple)) and len(geo) >= 2:
                try:
                    # [lng, lat] per GeoJSON convention
                    coords = (float(geo[1]), float(geo[0]))
                except (ValueError, TypeError):
                    pass
        # 3. Direct lat/lng: {"lat": 19.99, "lng": 73.78}
        elif 'lat' in loc and 'lng' in loc:
            try:
                coords = (float(loc['lat']), float(loc['lng']))
            except (ValueError, TypeError):
                pass
    elif isinstance(loc, str) and loc.strip():
        region = loc.strip()

    return coords, region


def is_nearby(listing1, listing2, max_distance_km=DEFAULT_MAX_DISTANCE_KM):
    """
    Check if two listings are within acceptable geographical proximity.
    If GPS coordinates exist for both, tests distance <= max_distance_km.
    Otherwise, compares district/region strings.
    """
    coords1, region1 = extract_location_info(listing1)
    coords2, region2 = extract_location_info(listing2)

    # If both have GPS coordinates, use precise Haversine distance
    if coords1 and coords2:
        dist = haversine_distance_km(coords1, coords2)
        return dist <= max_distance_km

    # Otherwise compare region strings
    r1 = region1.lower().strip()
    r2 = region2.lower().strip()

    if r1 == r2:
        return True

    # District containment check (e.g. "Nashik" in "Nashik, Maharashtra")
    dist1 = r1.split(',')[0].strip()
    dist2 = r2.split(',')[0].strip()
    if dist1 and dist2 and (dist1 == dist2 or dist1 in dist2 or dist2 in dist1):
        return True

    # Default fallback if region is General
    if 'general' in r1 or 'general' in r2:
        return True

    return False


def _parse_created_at(created_at_val):
    """Helper to safely parse ISO timestamp strings into UTC datetimes."""
    if isinstance(created_at_val, datetime):
        if created_at_val.tzinfo is None:
            return created_at_val.replace(tzinfo=timezone.utc)
        return created_at_val
    if isinstance(created_at_val, str):
        try:
            # Handle ISO string with 'Z'
            cleaned = created_at_val.replace('Z', '+00:00')
            dt = datetime.fromisoformat(cleaned)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            pass
    return datetime.now(timezone.utc)


def group_listings_by_proximity(listings, max_distance_km=DEFAULT_MAX_DISTANCE_KM):
    """
    Clusters a list of listings (already having identical crop & grade)
    into proximity groups.
    """
    clusters = []
    unassigned = list(listings)

    while unassigned:
        base = unassigned.pop(0)
        current_cluster = [base]
        remaining = []

        for other in unassigned:
            if is_nearby(base, other, max_distance_km):
                current_cluster.append(other)
            else:
                remaining.append(other)

        clusters.append(current_cluster)
        unassigned = remaining

    return clusters


def pool_open_listings(
    db=None,
    min_quantity_kg=None,
    max_wait_minutes=None,
    max_distance_km=DEFAULT_MAX_DISTANCE_KM,
    dry_run=False
):
    """
    Cross-Farmer Pooling Engine.

    Groups open produce listings by crop, quality grade, and geographic proximity.
    Creates a new document in `pooled_batches` once:
      1. Total volume in the cluster >= min_quantity_kg, OR
      2. The oldest listing in the cluster has waited >= max_wait_minutes.

    Transitions participating listings to status 'pooled' with 'pooled_batch_id'.
    Uses atomic optimistic locking to avoid race conditions.

    Returns:
        list of created (or simulated) pooled_batch dictionaries.
    """
    if db is None:
        db = extensions.db
        if db is None:
            raise RuntimeError("Database connection not initialized.")

    # Retrieve config values if available
    try:
        config_min_qty = current_app.config.get('POOLING_MIN_QUANTITY_KG')
        config_max_wait = current_app.config.get('POOLING_MAX_WAIT_MINUTES')
    except Exception:
        config_min_qty = None
        config_max_wait = None

    if min_quantity_kg is None:
        min_quantity_kg = float(config_min_qty if config_min_qty is not None else DEFAULT_MIN_QUANTITY_KG)
    if max_wait_minutes is None:
        max_wait_minutes = int(config_max_wait if config_max_wait is not None else DEFAULT_MAX_WAIT_MINUTES)

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # Query all currently open listings
    open_listings = list(db.produce_listings.find({'status': 'open'}).sort('created_at', 1))
    if not open_listings:
        return []

    # Group listings by (normalized_crop, quality_grade)
    # Edge Case 20: Only group listings with identical quality grade; only pool graded produce (A, B, C)
    crop_grade_groups = {}
    for listing in open_listings:
        crop_raw = str(listing.get('crop') or '').strip().title()
        grade_raw = str(listing.get('quality_grade') or '').strip().upper()

        # Only pool recognized quality grades
        if grade_raw not in ('A', 'B', 'C'):
            continue

        key = (crop_raw, grade_raw)
        if key not in crop_grade_groups:
            crop_grade_groups[key] = []
        crop_grade_groups[key].append(listing)

    created_batches = []

    for (crop_name, quality_grade), group in crop_grade_groups.items():
        # Divide into proximity clusters
        clusters = group_listings_by_proximity(group, max_distance_km)

        for cluster in clusters:
            if not cluster:
                continue

            total_kg = sum(
                float(l.get('quantity_remaining_kg') if l.get('quantity_remaining_kg') is not None else l.get('quantity_kg', 0))
                for l in cluster
            )

            # Check wait time of oldest listing in cluster
            oldest_dt = min(_parse_created_at(l.get('created_at')) for l in cluster)
            wait_minutes = (now - oldest_dt).total_seconds() / 60.0

            # Qualification check: Volume threshold OR timeout reached
            qualifies = (total_kg >= min_quantity_kg) or (wait_minutes >= max_wait_minutes)
            if not qualifies or total_kg <= 0:
                continue

            # Pick representative region from first listing or most common
            _, cluster_region = extract_location_info(cluster[0])

            if dry_run:
                # Record simulated batch
                created_batches.append({
                    'crop': crop_name,
                    'quality_grade': quality_grade,
                    'total_quantity_kg': total_kg,
                    'listing_ids': [l['_id'] for l in cluster],
                    'region': cluster_region,
                    'status': 'open',
                    'created_at': now_iso,
                    'simulated': True,
                })
                continue

            # Atomic Optimistic Locking: Lock listings by transitioning status 'open' -> 'pooled'
            actually_locked = []
            for l in cluster:
                locked_doc = db.produce_listings.find_one_and_update(
                    {'_id': l['_id'], 'status': 'open'},
                    {'$set': {'status': 'pooled', 'updated_at': now_iso}},
                    return_document=True
                )
                if locked_doc:
                    actually_locked.append(locked_doc)

            if not actually_locked:
                continue

            actual_total_kg = sum(
                float(l.get('quantity_remaining_kg') if l.get('quantity_remaining_kg') is not None else l.get('quantity_kg', 0))
                for l in actually_locked
            )

            # Insert into pooled_batches
            batch_doc = {
                'crop': crop_name,
                'quality_grade': quality_grade,
                'total_quantity_kg': float(actual_total_kg),
                'listing_ids': [l['_id'] for l in actually_locked],
                'region': cluster_region,
                'status': 'open',
                'created_at': now_iso,
            }
            res = db.pooled_batches.insert_one(batch_doc)
            batch_doc['_id'] = res.inserted_id

            # Associate pooled_batch_id with the locked listings
            db.produce_listings.update_many(
                {'_id': {'$in': [l['_id'] for l in actually_locked]}},
                {'$set': {'pooled_batch_id': batch_doc['_id']}}
            )

            created_batches.append(batch_doc)
            logger.info(
                "Created pooled batch %s for %s Grade %s: %s kg across %s listings",
                batch_doc['_id'], crop_name, quality_grade, actual_total_kg, len(actually_locked)
            )

    return created_batches
