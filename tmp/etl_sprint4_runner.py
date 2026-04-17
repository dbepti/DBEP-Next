#!/usr/bin/env python3
"""ETL Sprint 4 - FIELD"""
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

print("=== ETL Sprint 4: FIELD ===")
print("Step 1: FIELD...")
batch_insert("FIELD", load("fields"))
print("Step 2: FIELD_COMPONENT (link ke LAND_RIGHT)...")
batch_insert("FIELD_COMPONENT", load("field_components"))

print("\n=== Verifikasi ===")
r1 = sb.table("FIELD").select("FIELD_ID", count="exact").execute()
r2 = sb.table("FIELD_COMPONENT").select("FIELD_ID", count="exact").execute()
print(f"FIELD: {r1.count}")
print(f"FIELD_COMPONENT: {r2.count}")
print("\n✅ ETL Sprint 4 selesai!")
