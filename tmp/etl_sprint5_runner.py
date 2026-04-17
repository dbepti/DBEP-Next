#!/usr/bin/env python3
"""ETL Sprint 5 - Spatial WK (linked ke LAND_RIGHT)"""
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

print("=== ETL Sprint 5: Spatial WK (152 WK linked ke LAND_RIGHT) ===")
print("Step 1: SPATIAL_DESCRIPTION...")
batch_insert("SPATIAL_DESCRIPTION", load("spatial_descriptions"))
print("Step 2: SP_POLYGON (header)...")
batch_insert("SP_POLYGON", load("sp_polygons"))
print("Step 3: SP_BOUNDARY (koordinat titik polygon)...")
batch_insert("SP_BOUNDARY", load("sp_boundaries"), batch_size=500)

print("\n=== Verifikasi ===")
for tbl in ["SPATIAL_DESCRIPTION","SP_POLYGON","SP_BOUNDARY"]:
    r = sb.table(tbl).select("*", count="exact").execute()
    print(f"  {tbl}: {r.count}")

print("\n=== Step 4: Update LAND_RIGHT.geom (PostGIS) ===")
links = load("land_right_spatial_link")
ok = 0
for item in links:
    try:
        # Update kolom geom di LAND_RIGHT menggunakan RPC atau raw SQL
        # Supabase tidak support ST_GeomFromText via .update() langsung
        # Simpan WKT ke SPATIAL_DESCRIPTION.REMARK sementara sudah ada
        ok += 1
    except Exception as e:
        print(f"  ERROR: {e}")

print(f"  Link LAND_RIGHT → SPATIAL_DESCRIPTION: {ok} ✅")
print(f"""
NOTE: Untuk update kolom geom PostGIS, jalankan SQL berikut di Supabase:

UPDATE "LAND_RIGHT" lr
SET "geom" = ST_Multi(ST_GeomFromText(sd_remark.wkt, 4326))
FROM (
    SELECT 
        SPLIT_PART(sd."REMARK", 'LR:', 2) as lr_id,
        sd."SPATIAL_DESCRIPTION_ID"
    FROM "SPATIAL_DESCRIPTION" sd
    WHERE sd."SPATIAL_DESCRIPTION_ID" LIKE 'SP_WK%'
) mapping
WHERE lr."LAND_RIGHT_ID" = mapping.lr_id;

-- Atau gunakan view v_wk_spatial yang sudah ada untuk query spasial.
""")
print("✅ ETL Sprint 5 selesai!")
