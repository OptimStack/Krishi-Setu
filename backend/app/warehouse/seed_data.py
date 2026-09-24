import logging
from app.models.warehouse import Warehouse

logger = logging.getLogger(__name__)

DEFAULT_MAHARASHTRA_WAREHOUSES = [
    {
        "name": "MSWC Nashik Central Warehouse",
        "type": "warehouse",
        "coordinates": [73.7898, 19.9975],
        "district": "Nashik",
        "address": "MIDC Ambad, Nashik, Maharashtra 422010",
        "capacity_tonnes": 5000.0,
        "crop_types_supported": ["Onion", "Wheat", "Soybean", "Maize"],
        "contact_phone": "+91 253 2382101",
        "source": "mswc_official",
    },
    {
        "name": "Lasalgaon Agro Cold Storage & Silos",
        "type": "cold_storage",
        "coordinates": [74.2268, 20.1472],
        "district": "Nashik",
        "address": "Near APMC Market Yard, Lasalgaon, Nashik 422306",
        "capacity_tonnes": 3500.0,
        "crop_types_supported": ["Onion", "Tomato", "Pomegranate"],
        "contact_phone": "+91 255 0266212",
        "source": "mswc_official",
    },
    {
        "name": "Dindori Produce Packhouse & Cold Store",
        "type": "cold_storage",
        "coordinates": [73.8312, 20.2014],
        "district": "Nashik",
        "address": "Dindori-Vani Road, Dindori, Nashik 422202",
        "capacity_tonnes": 2000.0,
        "crop_types_supported": ["Tomato", "Onion", "Pomegranate"],
        "contact_phone": "+91 255 7221050",
        "source": "nabard_scheme",
    },
    {
        "name": "Pune APMC Agro Cold Chain Terminal",
        "type": "cold_storage",
        "coordinates": [73.8567, 18.5204],
        "district": "Pune",
        "address": "Gultekdi Market Yard, Pune, Maharashtra 411037",
        "capacity_tonnes": 4000.0,
        "crop_types_supported": ["Tomato", "Onion", "Pomegranate", "Vegetables"],
        "contact_phone": "+91 20 24268100",
        "source": "apmc_pune",
    },
    {
        "name": "Baramati Modern Agri Grain Silos",
        "type": "silo",
        "coordinates": [74.5815, 18.1517],
        "district": "Pune",
        "address": "MIDC Industrial Area, Baramati, Pune 413133",
        "capacity_tonnes": 6000.0,
        "crop_types_supported": ["Wheat", "Soybean", "Maize"],
        "contact_phone": "+91 211 2243555",
        "source": "mswc_official",
    },
    {
        "name": "Latur Oilseeds & Pulses Silo Terminal",
        "type": "silo",
        "coordinates": [76.5604, 18.4088],
        "district": "Latur",
        "address": "MIDC Additional Phase, Latur 413531",
        "capacity_tonnes": 8500.0,
        "crop_types_supported": ["Soybean", "Gram (Chana)", "Wheat"],
        "contact_phone": "+91 238 2221440",
        "source": "mswc_official",
    },
    {
        "name": "Ahmednagar District Central Godown",
        "type": "warehouse",
        "coordinates": [74.7496, 19.0952],
        "district": "Ahmednagar",
        "address": "Nagar-Kalyan Highway, Ahmednagar 414001",
        "capacity_tonnes": 4500.0,
        "crop_types_supported": ["Onion", "Soybean", "Wheat"],
        "contact_phone": "+91 241 2327500",
        "source": "mswc_official",
    },
    {
        "name": "Akola Cotton & Grain Godown",
        "type": "warehouse",
        "coordinates": [77.0082, 20.7002],
        "district": "Akola",
        "address": "Cotton Market Road, Akola 444001",
        "capacity_tonnes": 7000.0,
        "crop_types_supported": ["Cotton", "Soybean", "Wheat"],
        "contact_phone": "+91 724 2434100",
        "source": "mswc_official",
    },
    {
        "name": "Solapur Pomegranate & Grain Warehouse",
        "type": "warehouse",
        "coordinates": [75.9064, 17.6599],
        "district": "Solapur",
        "address": "Old Pune Naka, Solapur 413001",
        "capacity_tonnes": 3000.0,
        "crop_types_supported": ["Pomegranate", "Gram (Chana)", "Onion"],
        "contact_phone": "+91 217 2728800",
        "source": "mswc_official",
    },
    {
        "name": "Nagpur Agro Produce Cold Store",
        "type": "cold_storage",
        "coordinates": [79.0882, 21.1458],
        "district": "Nagpur",
        "address": "Kalamna Market Yard, Nagpur 440026",
        "capacity_tonnes": 3000.0,
        "crop_types_supported": ["Tomato", "Vegetables", "Wheat"],
        "contact_phone": "+91 712 2680450",
        "source": "mswc_official",
    },
]


def ensure_warehouses_seeded():
    """Seeds Maharashtra storage facilities if the collection is empty."""
    current_count = Warehouse.count()
    if current_count == 0:
        logger.info("Seeding %d Maharashtra agricultural warehouses...", len(DEFAULT_MAHARASHTRA_WAREHOUSES))
        inserted = []
        for w in DEFAULT_MAHARASHTRA_WAREHOUSES:
            doc = Warehouse.create(w)
            inserted.append(doc)
        return len(inserted)
    return current_count
