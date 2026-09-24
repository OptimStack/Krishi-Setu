#!/usr/bin/env python3
"""
CLI script to manually trigger Cross-Farmer Pooling.
Usage:
    python scripts/run_pooling_cli.py [--min-qty 500] [--max-wait 60] [--dry-run]
"""
import os
import sys
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app
from app.auction_engine.pooling import pool_open_listings


def main():
    parser = argparse.ArgumentParser(description="Trigger Cross-Farmer Pooling for Krishi-Setu.")
    parser.add_argument('--min-qty', type=float, default=None, help="Minimum volume threshold in kg")
    parser.add_argument('--max-wait', type=int, default=None, help="Max wait timeout in minutes")
    parser.add_argument('--max-dist', type=float, default=50.0, help="Max proximity radius in km")
    parser.add_argument('--dry-run', action='store_true', help="Preview pooling without writing to DB")

    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        print("[*] Starting Cross-Farmer Pooling Engine...")
        if args.dry_run:
            print("    [DRY-RUN MODE - No changes will be committed]")

        batches = pool_open_listings(
            min_quantity_kg=args.min_qty,
            max_wait_minutes=args.max_wait,
            max_distance_km=args.max_dist,
            dry_run=args.dry_run
        )

        if not batches:
            print("[-] No open listing clusters met volume or timeout thresholds.")
            return

        print(f"\n[+] Created {len(batches)} pooled batch(es):")
        for i, b in enumerate(batches, 1):
            batch_id = b.get('_id', 'SIMULATED')
            print(f"  {i}. Batch #{str(batch_id)[-6:].upper()} ({batch_id})")
            print(f"     Crop: {b['crop']} | Grade: {b['quality_grade']}")
            print(f"     Total Weight: {b['total_quantity_kg']:,.1f} kg (approx {b['total_quantity_kg']/100:.2f} Quintals)")
            print(f"     Region: {b.get('region', 'N/A')}")
            print(f"     Listings Pooled: {len(b.get('listing_ids', []))}")


if __name__ == '__main__':
    main()
