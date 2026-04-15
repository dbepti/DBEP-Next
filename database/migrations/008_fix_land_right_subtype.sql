-- ============================================================
-- Migration 008: Fix LAND_RIGHT_SUBTYPE ke nilai PPDM39 yang benar
-- SUDAH DIJALANKAN MANUAL DI SUPABASE pada 2026-04-15
-- File ini untuk dokumentasi dan re-deploy jika diperlukan
-- ============================================================
-- Valid values per PPDM39 doc + LR_CK2:
--   LAND_AGREEMENT, LAND_AGREE_PART, LAND_LEASE,
--   LAND_GRANTED_RIGHT, LAND_UNIT, LAND_UNIT_TRACT, LAND_TITLE
-- Mapping WK Indonesia: semua PSC/TAC/JOB/COW → LAND_AGREEMENT
-- ============================================================

BEGIN;

ALTER TABLE land_alias 
    DROP CONSTRAINT IF EXISTS land_alias_land_right_subtype_land_right_id_fkey;
ALTER TABLE land_right_instrument 
    DROP CONSTRAINT IF EXISTS land_right_instrument_land_right_subtype_land_right_id_fkey;

UPDATE land_right SET land_right_subtype = 
    CASE WHEN land_right_category = 'WK_UNITIZED' THEN 'LAND_UNIT'
    ELSE 'LAND_AGREEMENT' END;

UPDATE land_alias SET land_right_subtype = 'LAND_AGREEMENT';
UPDATE land_right_instrument SET land_right_subtype = 'LAND_AGREEMENT';
UPDATE int_set_component SET land_right_subtype = 'LAND_AGREEMENT' WHERE land_right_subtype IS NOT NULL;
UPDATE land_right_component SET land_right_subtype = 'LAND_AGREEMENT' WHERE land_right_subtype IS NOT NULL;

ALTER TABLE land_alias ADD CONSTRAINT land_alias_land_right_subtype_land_right_id_fkey 
    FOREIGN KEY (land_right_subtype, land_right_id) REFERENCES land_right(land_right_subtype, land_right_id);
ALTER TABLE land_right_instrument ADD CONSTRAINT land_right_instrument_land_right_subtype_land_right_id_fkey 
    FOREIGN KEY (land_right_subtype, land_right_id) REFERENCES land_right(land_right_subtype, land_right_id);

COMMIT;

ALTER TABLE land_right DROP CONSTRAINT IF EXISTS ck_land_right_subtype;
ALTER TABLE land_right ADD CONSTRAINT ck_land_right_subtype 
    CHECK (land_right_subtype IN (
        'LAND_AGREEMENT','LAND_AGREE_PART','LAND_LEASE',
        'LAND_GRANTED_RIGHT','LAND_UNIT','LAND_UNIT_TRACT','LAND_TITLE'
    ));
