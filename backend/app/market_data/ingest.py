import os
import csv
import logging
from datetime import datetime, timezone
from app.models.market_price import MarketPrice
from app.market_data.sources.enam import fetch_enam_data
from app.market_data.sources.agmarknet import fetch_agmarknet_data
from app.market_data.sources.data_gov_in import fetch_data_gov_in

logger = logging.getLogger(__name__)


def ingest_from_sources(days: int = 30):
    """
    Pulls price data across eNAM, Agmarknet, and data.gov.in,
    cross-checks and deduplicates, and ingests into market_prices.
    """
    logger.info("Starting market data ingestion from all sources for past %d days...", days)
    enam_records = fetch_enam_data()
    agmarknet_records = fetch_agmarknet_data()
    data_gov_records = fetch_data_gov_in()

    all_raw = enam_records + agmarknet_records + data_gov_records
    logger.info("Aggregated %d raw records across sources", len(all_raw))

    # Cross-check and reconcile records by (crop, mandi_name, date)
    reconciled_map = {}
    for r in all_raw:
        key = (r['crop'], r['mandi_name'], r['date'])
        if key not in reconciled_map:
            reconciled_map[key] = {
                'crop': r['crop'],
                'mandi_name': r['mandi_name'],
                'date': r['date'],
                'source': r['source'],
                'min_prices': [r['min_price_per_quintal']],
                'max_prices': [r['max_price_per_quintal']],
                'modal_prices': [r['modal_price_per_quintal']],
            }
        else:
            reconciled_map[key]['min_prices'].append(r['min_price_per_quintal'])
            reconciled_map[key]['max_prices'].append(r['max_price_per_quintal'])
            reconciled_map[key]['modal_prices'].append(r['modal_price_per_quintal'])
            reconciled_map[key]['source'] = f"{reconciled_map[key]['source']},{r['source']}"

    reconciled_docs = []
    now = datetime.now(timezone.utc).isoformat()
    for key, data in reconciled_map.items():
        doc = {
            'crop': data['crop'],
            'mandi_name': data['mandi_name'],
            'date': data['date'],
            'source': data['source'],
            'min_price_per_quintal': round(sum(data['min_prices']) / len(data['min_prices']), 2),
            'max_price_per_quintal': round(sum(data['max_prices']) / len(data['max_prices']), 2),
            'modal_price_per_quintal': round(sum(data['modal_prices']) / len(data['modal_prices']), 2),
            'ingested_at': now,
        }
        reconciled_docs.append(doc)

    if reconciled_docs:
        MarketPrice.bulk_insert(reconciled_docs)
        logger.info("Successfully ingested %d reconciled market price records", len(reconciled_docs))

    return {
        "raw_count": len(all_raw),
        "reconciled_count": len(reconciled_docs),
        "sources": ["enam", "agmarknet", "data_gov_in"]
    }


def ingest_from_csv(csv_path: str, max_records: int = 2000):
    """
    Ingests preprocessed historical mandi CSV (e.g. from ml/datasets/processed/mandi_prices.csv).
    """
    if not os.path.exists(csv_path):
        logger.warning("CSV path %s does not exist", csv_path)
        return 0

    records = []
    now = datetime.now(timezone.utc).isoformat()

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if max_records and i >= max_records:
                break
            records.append({
                "crop": row["crop"],
                "mandi_name": row["mandi_name"],
                "source": "historical_csv",
                "date": row["date"],
                "min_price_per_quintal": float(row.get("min_price_per_quintal", row["modal_price_per_quintal"])),
                "max_price_per_quintal": float(row.get("max_price_per_quintal", row["modal_price_per_quintal"])),
                "modal_price_per_quintal": float(row["modal_price_per_quintal"]),
                "ingested_at": now,
            })

    if records:
        MarketPrice.bulk_insert(records)
        logger.info("Ingested %d records from CSV %s", len(records), csv_path)

    return len(records)
