#!/usr/bin/env python3
"""
CLI script to manually trigger a Double-Auction Round.
Usage:
    python scripts/run_batch_auction_cli.py [--crop Wheat] [--no-pool]
"""
import os
import sys
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app
from app.auction_engine.batch_scheduler import run_batch_auction


def main():
    parser = argparse.ArgumentParser(description="Trigger Krishi-Setu Double-Auction Engine.")
    parser.add_argument('--crop', type=str, default=None, help="Specific crop to run auction for (default: all active crops)")
    parser.add_argument('--no-pool', action='store_true', help="Skip auto-pooling step prior to auction run")

    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        print("[*] Starting Krishi-Setu Double-Auction Engine...")
        if not args.no_pool:
            print("    Step 1: Running cross-farmer pooling for open listings...")
        else:
            print("    [Skipping auto-pooling step]")

        results = run_batch_auction(crop=args.crop, pool_first=not args.no_pool)

        if not results:
            print("[-] No active crops with open pooled batches or bids found.")
            return

        print(f"\n[+] Executed {len(results)} auction round(s):")
        for res in results:
            crop = res['crop']
            round_doc = res['round']
            trades = res['trades']

            round_id = str(round_doc.get('_id', 'N/A'))
            status = round_doc.get('status', 'N/A')
            clearing_price = round_doc.get('clearing_price_per_kg')

            print(f"\n=======================================================")
            print(f"  Auction Round: #{round_id[-6:].upper()} ({round_id})")
            print(f"  Crop: {crop} | Status: {status}")

            if status == 'no_match':
                print("  Result: No overlapping bids/asks found (order book carries forward).")
                continue

            print(f"  Clearing Price: Rs {clearing_price:,.2f}/kg (Rs {clearing_price*100:,.2f}/Quintal)")
            print(f"  Total Trades Created: {len(trades)}")

            for idx, trade in enumerate(trades, 1):
                tid = str(trade['_id'])
                qty = trade['quantity_kg']
                tot = trade['total_amount']
                buyer_id = str(trade['buyer_id'])
                batch_id = str(trade['pooled_batch_id'])

                print(f"\n    --- Trade #{idx}: #{tid[-6:].upper()} ({tid}) ---")
                print(f"    Buyer: {buyer_id} | Batch: {batch_id}")
                print(f"    Volume: {qty:,.1f} kg ({qty/100:.2f} Qtl) | Amount: Rs {tot:,.2f}")
                print(f"    Pro-Rata Farmer Shares ({len(trade.get('farmer_shares', []))} farmers):")

                for s_idx, share in enumerate(trade.get('farmer_shares', []), 1):
                    fid = str(share['farmer_id'])
                    s_qty = share['quantity_kg']
                    s_payout = share['payout_amount']
                    print(f"      [{s_idx}] Farmer {fid[-6:].upper()}: {s_qty:,.1f} kg -> Payout: Rs {s_payout:,.2f}")


if __name__ == '__main__':
    main()