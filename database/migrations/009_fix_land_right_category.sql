-- =========================================================================
-- 009_fix_land_right_category.sql
-- =========================================================================
-- Tujuan: Mengisi kolom LAND_RIGHT.LAND_RIGHT_CATEGORY yang NULL berdasarkan
--         nama operator aktif (INT_SET_PARTNER) atau operator historis terbaru.
--
-- Konteks masalah:
-- Setelah ETL dari DBEP lama, 731 dari 732 WK punya LAND_RIGHT_CATEGORY NULL.
-- Akibatnya UI menampilkan semua WK sebagai "PSC" (default), sehingga WK JOB
-- seperti Senoro-Toili, Jambi Merang, Tuban, dll. terlihat seolah-olah sudah
-- beralih ke PSC. Padahal data operator (INT_SET_PARTNER) utuh — hanya kolom
-- kategori yang kosong.
--
-- Strategi:
--   1. WK dengan operator aktif (ACTIVE_IND='Y') → infer kategori dari nama operator
--   2. WK tanpa operator aktif tapi punya operator historis → pakai operator
--      historis terbaru (EFFECTIVE_DATE DESC)
--   3. WK tanpa operator sama sekali → default PSC
--
-- Mapping nama operator → kategori:
--   - "JOB %"    → JOB (Joint Operating Body)
--   - "TAC %"    → TAC (Technical Assistance Contract)
--   - "KSO %" atau mengandung "KSO" → KSO (Kerja Sama Operasi)
--   - Lainnya    → PSC (Production Sharing Contract)
-- =========================================================================

BEGIN;

-- Step 1: Fix WK dengan operator AKTIF (505 WK: 492 PSC + 13 JOB)
UPDATE "LAND_RIGHT" lr
SET "LAND_RIGHT_CATEGORY" = CASE
    WHEN ba."BA_LONG_NAME" ILIKE 'JOB %' THEN 'JOB'
    WHEN ba."BA_LONG_NAME" ILIKE 'TAC %' THEN 'TAC'
    WHEN ba."BA_LONG_NAME" ILIKE 'KSO %' OR ba."BA_LONG_NAME" ILIKE '%KSO%' THEN 'KSO'
    ELSE 'PSC'
END
FROM "INT_SET_PARTNER" isp
JOIN "BUSINESS_ASSOCIATE" ba ON ba."BUSINESS_ASSOCIATE_ID" = isp."PARTNER_BA_ID"
WHERE isp."INTEREST_SET_ID" = lr."LAND_RIGHT_ID"
  AND isp."ACTIVE_IND" = 'Y'
  AND isp."INTEREST_SET_ROLE" = 'OPERATOR'
  AND lr."LAND_RIGHT_SUBTYPE" = 'LAND_AGREEMENT'
  AND lr."LAND_RIGHT_CATEGORY" IS NULL;

-- Step 2: Fix WK terminated dengan operator historis (206 WK)
UPDATE "LAND_RIGHT" lr
SET "LAND_RIGHT_CATEGORY" = CASE
    WHEN ba."BA_LONG_NAME" ILIKE 'JOB %' THEN 'JOB'
    WHEN ba."BA_LONG_NAME" ILIKE 'TAC %' THEN 'TAC'
    WHEN ba."BA_LONG_NAME" ILIKE 'KSO %' OR ba."BA_LONG_NAME" ILIKE '%KSO%' THEN 'KSO'
    ELSE 'PSC'
END
FROM (
    SELECT DISTINCT ON (isp."INTEREST_SET_ID")
        isp."INTEREST_SET_ID",
        isp."PARTNER_BA_ID"
    FROM "INT_SET_PARTNER" isp
    WHERE isp."INTEREST_SET_ROLE" = 'OPERATOR'
    ORDER BY isp."INTEREST_SET_ID", isp."EFFECTIVE_DATE" DESC NULLS LAST
) latest_op
JOIN "BUSINESS_ASSOCIATE" ba ON ba."BUSINESS_ASSOCIATE_ID" = latest_op."PARTNER_BA_ID"
WHERE latest_op."INTEREST_SET_ID" = lr."LAND_RIGHT_ID"
  AND lr."LAND_RIGHT_SUBTYPE" = 'LAND_AGREEMENT'
  AND lr."LAND_RIGHT_CATEGORY" IS NULL;

-- Step 3: Default PSC untuk 21 WK tanpa operator sama sekali (semua terminated)
UPDATE "LAND_RIGHT"
SET "LAND_RIGHT_CATEGORY" = 'PSC'
WHERE "LAND_RIGHT_SUBTYPE" = 'LAND_AGREEMENT'
  AND "LAND_RIGHT_CATEGORY" IS NULL;

COMMIT;

-- =========================================================================
-- Verifikasi distribusi akhir
-- Hasil yang diharapkan:
--   PSC: ~662 (147 aktif, ~515 terminated)
--   JOB:  16  (8 aktif,   8 terminated)
--   TAC:  43  (0 aktif,  43 terminated)
--   KSO:  11  (0 aktif,  11 terminated)
--   Total: 732
-- =========================================================================
SELECT 
    "LAND_RIGHT_CATEGORY" as kategori,
    COUNT(*) as jumlah,
    COUNT(*) FILTER (WHERE "ACTIVE_IND" = 'Y') as aktif,
    COUNT(*) FILTER (WHERE "ACTIVE_IND" = 'N') as terminated
FROM "LAND_RIGHT"
WHERE "LAND_RIGHT_SUBTYPE" = 'LAND_AGREEMENT'
GROUP BY "LAND_RIGHT_CATEGORY"
ORDER BY jumlah DESC;
