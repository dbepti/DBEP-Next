#!/usr/bin/env python3
"""ETL Sprint 3 - OBLIGATION + OBLIGATION_COMPONENT + POD Documents"""
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

print("=== ETL Sprint 3: Komitmen (OBLIGATION) ===")
print("Step 1: OBLIGATION...")
batch_insert("OBLIGATION", load("obligations"))
print("Step 2: OBLIGATION_COMPONENT (link ke LAND_RIGHT)...")
batch_insert("OBLIGATION_COMPONENT", load("ob_components"))

print("\n=== ETL Sprint 3: POD/POP/POFD Documents ===")
print("Step 3: RM_INFORMATION_ITEM POD...")
batch_insert("RM_INFORMATION_ITEM", load("pod_rmii"))
print("Step 4: RM_DOCUMENT POD...")
batch_insert("RM_DOCUMENT", load("pod_rmd"))
print("Step 5: RM_INFO_ITEM_CONTENT POD...")
batch_insert("RM_INFO_ITEM_CONTENT", load("pod_rmiic"))

print("\n=== Verifikasi ===")
r1 = sb.table("OBLIGATION").select("OBLIGATION_ID", count="exact").execute()
r2 = sb.table("OBLIGATION_COMPONENT").select("OBLIGATION_ID", count="exact").execute()
r3 = sb.table("RM_INFORMATION_ITEM").select("INFORMATION_ITEM_ID", count="exact").execute()
print(f"OBLIGATION: {r1.count}")
print(f"OBLIGATION_COMPONENT: {r2.count}")
print(f"RM_INFORMATION_ITEM: {r3.count}")
print("\n✅ ETL Sprint 3 selesai!")
