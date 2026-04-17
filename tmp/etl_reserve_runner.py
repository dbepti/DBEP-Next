#!/usr/bin/env python3
"""ETL Reserve Data — A10_RESERVE_REMAINING"""
import json, os, sys
from supabase import create_client

sb = create_client(
    "https://zoyalstfafhesofjgyvw.supabase.co",
    os.environ.get("SUPABASE_KEY","")
)
if not os.environ.get("SUPABASE_KEY"):
    print("ERROR: Set SUPABASE_KEY"); sys.exit(1)

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

def batch_insert(table, records, batch_size=200):
    total = len(records)
    ok = 0
    for i in range(0, total, batch_size):
        batch = [{k:v for k,v in r.items() if v is not None} for r in records[i:i+batch_size]]
        try:
            sb.table(table).insert(batch).execute()
            ok += len(batch)
            print(f"  {table}: {ok}/{total}", end="\r", flush=True)
        except Exception as e:
            print(f"\n  ERROR batch {i}: {e}")
            return ok
    print(f"  {table}: {ok}/{total} ✅")
    return ok

def load(name):
    with open(f"{DATA_DIR}/{name}.json") as f:
        return json.load(f)

print("=== ETL Reserve Data ===")
print("Step 1: RESERVE_ENTITY...")
batch_insert("RESERVE_ENTITY", load("reserve_entities"))
print("Step 2: RESENT_CLASS...")
batch_insert("RESENT_CLASS", load("resent_classes"))
print("Step 3: RESENT_PRODUCT...")
batch_insert("RESENT_PRODUCT", load("resent_products"))
print("Step 4: RESENT_VOL_SUMMARY...")
batch_insert("RESENT_VOL_SUMMARY", load("resent_vol_summaries"))

print("\n=== Verifikasi ===")
for tbl in ["RESERVE_ENTITY","RESENT_CLASS","RESENT_PRODUCT","RESENT_VOL_SUMMARY"]:
    r = sb.table(tbl).select("*", count="exact").execute()
    print(f"  {tbl}: {r.count}")
print("\n✅ ETL Reserve selesai!")
