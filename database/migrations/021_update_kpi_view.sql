-- Migration 021 (FIXED): Update v_stats_kpi_header view
-- Sprint: Dashboard Fix (related to Migration 020)
-- Date: 2026-04-23
-- Author: Heru Murdhaningrat
--
-- FIX from original 021:
--   Previous version placed new columns in middle (position 2,3), which 
--   triggered PostgreSQL error 42P16 "cannot change name of view column".
--   This fixed version places new columns at the END (positions 10, 11).
--
-- PPDM 3.9 Compliance (per ADR-001):
--   - No ALTER TABLE (schema unchanged)
--   - No new custom columns or tables
--   - Only CREATE OR REPLACE VIEW
--   - Uses only existing PPDM columns

BEGIN;

CREATE OR REPLACE VIEW v_stats_kpi_header AS
SELECT 
    -- Existing columns (same order as before, DO NOT MODIFY)
    (SELECT COUNT(*)::integer FROM "LAND_RIGHT" WHERE "ACTIVE_IND"::text = 'Y'::text) AS wk_aktif,
    (SELECT COUNT(*)::integer FROM "LAND_RIGHT" WHERE "ACTIVE_IND"::text = 'N'::text) AS wk_terminasi,
    (SELECT COUNT(*)::integer FROM "LAND_RIGHT") AS wk_total,
    (SELECT COUNT(*)::integer FROM "BUSINESS_ASSOCIATE") AS kkks_total,
    (SELECT COUNT(*)::integer FROM v_dokumen) AS dokumen_total,
    (SELECT COUNT(*)::integer FROM v_cadangan) AS cadangan_entri,
    (SELECT COUNT(*)::integer FROM v_resources) AS resources_total,
    (SELECT COUNT(*)::integer FROM v_resources 
     WHERE v_resources.pl_status::text = 'PROSPECT'::text) AS prospect_total,
    (SELECT COUNT(*)::integer FROM v_resources 
     WHERE v_resources.pl_status::text = 'LEAD'::text) AS lead_total,
    
    -- NEW columns (added at end to comply with PostgreSQL CREATE OR REPLACE VIEW rules)
    (SELECT COUNT(*)::integer FROM "LAND_RIGHT" 
     WHERE "ACTIVE_IND"::text = 'Y'::text 
       AND "PRODUCING_IND"::text = 'Y'::text) AS wk_producing,
    
    (SELECT COUNT(*)::integer FROM "LAND_RIGHT" 
     WHERE "ACTIVE_IND"::text = 'Y'::text 
       AND "PRODUCING_IND"::text = 'N'::text) AS wk_not_producing;

COMMIT;

-- Verification:
-- SELECT * FROM v_stats_kpi_header;
-- Expected columns (in order):
--   wk_aktif=155, wk_terminasi=577, wk_total=732, kkks_total=997, 
--   dokumen_total=16793, cadangan_entri=8856, resources_total=14065,
--   prospect_total=6972, lead_total=7093,
--   wk_producing=82, wk_not_producing=73

-- Rollback (if needed):
-- BEGIN;
-- CREATE OR REPLACE VIEW v_stats_kpi_header AS
-- SELECT 
--     (SELECT COUNT(*)::integer FROM "LAND_RIGHT" WHERE "ACTIVE_IND"::text = 'Y'::text) AS wk_aktif,
--     (SELECT COUNT(*)::integer FROM "LAND_RIGHT" WHERE "ACTIVE_IND"::text = 'N'::text) AS wk_terminasi,
--     (SELECT COUNT(*)::integer FROM "LAND_RIGHT") AS wk_total,
--     (SELECT COUNT(*)::integer FROM "BUSINESS_ASSOCIATE") AS kkks_total,
--     (SELECT COUNT(*)::integer FROM v_dokumen) AS dokumen_total,
--     (SELECT COUNT(*)::integer FROM v_cadangan) AS cadangan_entri,
--     (SELECT COUNT(*)::integer FROM v_resources) AS resources_total,
--     (SELECT COUNT(*)::integer FROM v_resources WHERE v_resources.pl_status::text = 'PROSPECT'::text) AS prospect_total,
--     (SELECT COUNT(*)::integer FROM v_resources WHERE v_resources.pl_status::text = 'LEAD'::text) AS lead_total;
-- COMMIT;