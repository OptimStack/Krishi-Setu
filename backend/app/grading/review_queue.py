import logging
from bson import ObjectId
from app.models.grading_record import GradingRecord
from app.models.produce_listing import ProduceListing
from app.models.user import User

logger = logging.getLogger(__name__)


def get_pending_review_queue(limit: int = 50):
    """
    Retrieves all grading records that require human review,
    enriched with produce listing and farmer details.
    """
    records = GradingRecord.find_pending_review(limit=limit)
    enriched = []

    for rec in records:
        item = dict(rec)
        listing_id = rec.get("listing_id")
        listing = ProduceListing.find_by_id(listing_id) if listing_id else None

        if listing:
            item["listing"] = {
                "id": str(listing["_id"]),
                "crop": listing.get("crop"),
                "variety": listing.get("variety"),
                "quantity_kg": listing.get("quantity_kg"),
                "ask_price_per_kg": listing.get("ask_price_per_kg"),
                "quality_grade": listing.get("quality_grade"),
                "status": listing.get("status"),
                "location": listing.get("location"),
                "image_url": listing.get("image_url")
            }
            farmer_id = listing.get("farmer_id")
            if farmer_id:
                farmer = User.find_by_id(farmer_id)
                if farmer:
                    item["farmer"] = {
                        "id": str(farmer["_id"]),
                        "name": farmer.get("name"),
                        "phone": farmer.get("phone")
                    }
        enriched.append(item)

    return enriched


def override_grading_result(record_id: str, override_grade: str, reviewer_id: str = None):
    """
    Applies an admin manual override to a grading record and updates the associated listing.
    """
    clean_grade = override_grade.strip().upper()
    if clean_grade not in ["A", "B", "C"]:
        raise ValueError(f"Invalid grade '{override_grade}'. Must be 'A', 'B', or 'C'.")

    record = GradingRecord.find_by_id(record_id)
    if not record:
        return None, None

    updated_record = GradingRecord.override_grade(record_id, clean_grade, reviewer_id=reviewer_id)

    listing_id = record.get("listing_id")
    updated_listing = None
    if listing_id:
        updated_listing = ProduceListing.update(listing_id, {"quality_grade": clean_grade})

    return updated_record, updated_listing
