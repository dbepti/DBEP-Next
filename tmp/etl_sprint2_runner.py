#!/usr/bin/env python3
"""ETL Sprint 2 - WPB & AFE Documents
Jalankan: export SUPABASE_KEY=... && python3 etl_sprint2_runner.py
"""
import json, os, sys
from supabase import create_client

SUPABASE_URL = "https://zoyalstfafhesofjgyvw.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY","")
if not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_KEY dulu")
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

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

print("=== ETL Sprint 2: WPB Documents ===")
print("Step 1: RM_INFORMATION_ITEM WPB...")
batch_insert("RM_INFORMATION_ITEM", load("wpb_rmii"))
print("Step 2: RM_DOCUMENT WPB...")
batch_insert("RM_DOCUMENT", load("wpb_rmd"))
print("Step 3: RM_INFO_ITEM_CONTENT WPB...")
batch_insert("RM_INFO_ITEM_CONTENT", load("wpb_rmiic"))

print("\n=== ETL Sprint 2: AFE Documents ===")
print("Step 4: RM_INFORMATION_ITEM AFE...")
batch_insert("RM_INFORMATION_ITEM", load("afe_rmii"))
print("Step 5: RM_DOCUMENT AFE...")
batch_insert("RM_DOCUMENT", load("afe_rmd"))
print("Step 6: RM_INFO_ITEM_CONTENT AFE...")
batch_insert("RM_INFO_ITEM_CONTENT", load("afe_rmiic"))

print("\n=== Verifikasi ===")
r1 = sb.table("RM_INFORMATION_ITEM").select("INFORMATION_ITEM_ID", count="exact").execute()
r2 = sb.table("RM_DOCUMENT").select("INFORMATION_ITEM_ID", count="exact").execute()
r3 = sb.table("RM_INFO_ITEM_CONTENT").select("INFORMATION_ITEM_ID", count="exact").execute()
print(f"RM_INFORMATION_ITEM: {r1.count}")
print(f"RM_DOCUMENT: {r2.count}")
print(f"RM_INFO_ITEM_CONTENT: {r3.count}")
print("\n✅ ETL Sprint 2 selesai!")
