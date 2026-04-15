-- ============================================================
-- V_WK_LENGKAP: View untuk halaman Wilayah Kerja di DBEP-Next
-- Jalankan di Supabase SQL Editor
-- ============================================================
CREATE OR REPLACE VIEW v_wk_lengkap AS
SELECT
  lr."LAND_RIGHT_ID"                                          AS wkid,
  COALESCE(la."ALIAS_LONG_NAME", lr."LAND_RIGHT_ID")          AS nama_wk,
  COALESCE(la."ALIAS_SHORT_NAME", lr."LAND_RIGHT_ID")         AS nama_wk_short,
  lr."GRANTED_RIGHT_TYPE"                                     AS tipe_kontrak,
  lr."ACTIVE_IND"                                             AS aktif,
  lr."EFFECTIVE_DATE"                                         AS tgl_efektif,
  lr."EXPIRY_DATE"                                            AS tgl_berakhir,
  lr."ACQTN_DATE"                                             AS tgl_ttd,
  lr."GROSS_SIZE"                                             AS luas_km2,
  lr."GROSS_SIZE_OUOM"                                        AS satuan_luas,

  -- Status dari ACTIVE_IND
  CASE lr."ACTIVE_IND" WHEN 'Y' THEN 'ACTIVE' ELSE 'TERMINATED' END AS status_wk,

  -- Lokasi dari REMARK (format: WK:...|LOC:...|STAGE:...|STATUS:...)
  CASE
    WHEN lr."REMARK" LIKE '%LOC:ONSHORE/OFFSHORE%' THEN 'ONSHORE/OFFSHORE'
    WHEN lr."REMARK" LIKE '%LOC:ONSHORE%'          THEN 'ONSHORE'
    WHEN lr."REMARK" LIKE '%LOC:OFFSHORE%'         THEN 'OFFSHORE'
    ELSE ''
  END AS lokasi,

  -- Fase dari REMARK
  CASE
    WHEN lr."REMARK" LIKE '%STAGE:PRODUCTION%'       THEN 'PRODUCTION'
    WHEN lr."REMARK" LIKE '%STAGE:EXPLORATION GMB%'  THEN 'EXPLORATION GMB'
    WHEN lr."REMARK" LIKE '%STAGE:EXPLORATION%'      THEN 'EXPLORATION'
    WHEN lr."REMARK" LIKE '%STAGE:DEVELOPMENT%'      THEN 'DEVELOPMENT'
    ELSE ''
  END AS fase,

  -- Operator utama (ACTIVE_IND='Y', OBS_NO terkecil)
  (
    SELECT ba."BA_LONG_NAME"
    FROM   "INT_SET_PARTNER"    isp
    JOIN   "BUSINESS_ASSOCIATE" ba  ON ba."BUSINESS_ASSOCIATE_ID" = isp."PARTNER_BA_ID"
    WHERE  isp."INTEREST_SET_ID"   = lr."LAND_RIGHT_ID"
      AND  isp."INTEREST_SET_ROLE" = 'OPERATOR'
      AND  isp."ACTIVE_IND"        = 'Y'
    ORDER  BY isp."PARTNER_OBS_NO"
    LIMIT  1
  ) AS operator_utama,

  -- Semua operator aktif (pipe-separated)
  (
    SELECT STRING_AGG(ba."BA_LONG_NAME", ' | ' ORDER BY isp."PARTNER_OBS_NO")
    FROM   "INT_SET_PARTNER"    isp
    JOIN   "BUSINESS_ASSOCIATE" ba  ON ba."BUSINESS_ASSOCIATE_ID" = isp."PARTNER_BA_ID"
    WHERE  isp."INTEREST_SET_ID"   = lr."LAND_RIGHT_ID"
      AND  isp."INTEREST_SET_ROLE" = 'OPERATOR'
      AND  isp."ACTIVE_IND"        = 'Y'
  ) AS semua_operator_aktif,

  -- Jumlah operator
  (
    SELECT COUNT(*)
    FROM   "INT_SET_PARTNER" isp
    WHERE  isp."INTEREST_SET_ID"   = lr."LAND_RIGHT_ID"
      AND  isp."INTEREST_SET_ROLE" = 'OPERATOR'
  ) AS jumlah_operator

FROM "LAND_RIGHT" lr
LEFT JOIN "LAND_ALIAS" la
  ON  la."LAND_RIGHT_ID"      = lr."LAND_RIGHT_ID"
  AND la."LAND_RIGHT_SUBTYPE" = lr."LAND_RIGHT_SUBTYPE"
  AND la."LR_ALIAS_ID"        = 'WK_NAME'
WHERE lr."LAND_RIGHT_SUBTYPE" = 'LAND_AGREEMENT'
ORDER BY
  CASE lr."ACTIVE_IND" WHEN 'Y' THEN 0 ELSE 1 END,
  lr."LAND_RIGHT_ID";

-- Test:
-- SELECT * FROM v_wk_lengkap WHERE aktif = 'Y' LIMIT 10;
