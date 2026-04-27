-- Migration 020: Populate PRODUCING_IND from Excel 1 Februari 2026
-- Sprint: Data Reconciliation (parallel to Sprint 2 FK work)
-- Date: 2026-04-23
-- Author: Heru Murdhaningrat
-- Purpose: Fix misleading dashboard "Sedang berproduksi" label by populating 
--          actual production status from authoritative Excel source.
--
-- Background:
--   Dashboard shows "155 WK Aktif / Sedang berproduksi" but PRODUCING_IND is
--   all NULL. This migration populates the column from 
--   List_WK_Migas_Status_1_Februari_2026.xlsx (STATUS PRODUKSI column).
--
-- Mapping rules:
--   STATUS PRODUKSI = 'PRODUKSI'     -> PRODUCING_IND = 'Y' (82 WK)
--   STATUS PRODUKSI = 'PENGEMBANGAN' -> PRODUCING_IND = 'N' (24 WK)
--   STATUS PRODUKSI = 'NON-PRODUKSI' -> PRODUCING_IND = 'N' (49 WK)
--   Total: 155 WK (all active WKs in DBEP-Next matched)
--
-- Pre-checks verified:
--   - 155 active WK in DBEP-Next
--   - 160 WK in Excel source
--   - 100% match by normalized name
--   - 0 ambiguity for duplicate names (all resolve to same status)
--
-- Note on Excel WK not in DBEP:
--   12 WK in Excel are not in active DBEP set:
--   - 7 marked PROSES TERMINASI in Excel (already terminated in DBEP)
--   - 5 new WKs not yet added (CITARUM, NSO, SOUTH SAKAKEMANG, SOUTH SUMATERA, LAVENDER)
--   These will be handled in a separate migration (021).

BEGIN;

-- Safety check: ensure all target WK still exist and are active
DO $$
DECLARE
    missing_wk INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_wk
    FROM (VALUES 
        ('WK1401'),
        ('WK1402'),
        ('WK1325'),
        ('WK1405'),
        ('WK1355'),
        ('WK1417'),
        ('WK1002'),
        ('WK1004'),
        ('WK1386'),
        ('WK1380'),
        ('WK1010'),
        ('WK1011'),
        ('WK1012'),
        ('WK1152'),
        ('WK1014'),
        ('WK1015'),
        ('WK1404'),
        ('WK1016'),
        ('WK1019'),
        ('WK1020'),
        ('WK1398'),
        ('WK1416'),
        ('WK1422'),
        ('WK1423'),
        ('WK1241'),
        ('WK1411'),
        ('WK1025'),
        ('WK1026'),
        ('WK1028'),
        ('WK1029'),
        ('WK1407'),
        ('WK1031'),
        ('WK1415'),
        ('WK1032'),
        ('WK1034'),
        ('WK1035'),
        ('WK1149'),
        ('WK1387'),
        ('WK1381'),
        ('WK1007'),
        ('WK1410'),
        ('WK1334'),
        ('WK1382'),
        ('WK1312'),
        ('WK1418'),
        ('WK1419'),
        ('WK1044'),
        ('WK1045'),
        ('WK1246'),
        ('WK1268'),
        ('WK1277'),
        ('WK1262'),
        ('WK1234'),
        ('WK1048'),
        ('WK1408'),
        ('WK1294'),
        ('WK1051'),
        ('WK1052'),
        ('WK1392'),
        ('WK1053'),
        ('WK1162'),
        ('WK1177'),
        ('WK1055'),
        ('WK1056'),
        ('WK1413'),
        ('WK1058'),
        ('WK1308'),
        ('WK1239'),
        ('WK1164'),
        ('WK1061'),
        ('WK1287'),
        ('WK1255'),
        ('WK1063'),
        ('WK1094'),
        ('WK1065'),
        ('WK1328'),
        ('WK1066'),
        ('WK1067'),
        ('WK1390'),
        ('WK1069'),
        ('WK1412'),
        ('WK1071'),
        ('WK1073'),
        ('WK1074'),
        ('WK1075'),
        ('WK1079'),
        ('WK1302'),
        ('WK1403'),
        ('WK1368'),
        ('WK1257'),
        ('WK1008'),
        ('WK1090'),
        ('WK1092'),
        ('WK1424'),
        ('WK1089'),
        ('WK1425'),
        ('WK1093'),
        ('WK1095'),
        ('WK1096'),
        ('WK1097'),
        ('WK1100'),
        ('WK1220'),
        ('WK1409'),
        ('WK1384'),
        ('WK1406'),
        ('WK1426'),
        ('WK1427'),
        ('WK1102'),
        ('WK1171'),
        ('WK1104'),
        ('WK1106'),
        ('WK1107'),
        ('WK1259'),
        ('WK1364'),
        ('WK1110'),
        ('WK1112'),
        ('WK1040'),
        ('WK1244'),
        ('WK1397'),
        ('WK1116'),
        ('WK1118'),
        ('WK1198'),
        ('WK1274'),
        ('WK1119'),
        ('WK1120'),
        ('WK1399'),
        ('WK1121'),
        ('WK1414'),
        ('WK1366'),
        ('WK1125'),
        ('WK1389'),
        ('WK1201'),
        ('WK1275'),
        ('WK1202'),
        ('WK1222'),
        ('WK1050'),
        ('WK1080'),
        ('WK1223'),
        ('WK1207'),
        ('WK1128'),
        ('WK1132'),
        ('WK1133'),
        ('WK1156'),
        ('WK1135'),
        ('WK1167'),
        ('WK1136'),
        ('WK1137'),
        ('WK1160'),
        ('WK1169'),
        ('WK1395'),
        ('WK1140'),
        ('WK1141'),
        ('WK1142'),
        ('WK1385'),
        ('WK1143')

    ) AS target(wkid)
    WHERE NOT EXISTS (
        SELECT 1 FROM "LAND_RIGHT" lr
        WHERE lr."LAND_RIGHT_ID" = target.wkid
          AND lr."ACTIVE_IND" = 'Y'
    );
    
    IF missing_wk > 0 THEN
        RAISE EXCEPTION 'Pre-check failed: % WK from matches are not active in DBEP', missing_wk;
    END IF;
    
    RAISE NOTICE 'Pre-check passed: all 155 target WKs exist and active';
END $$;

-- UPDATE PRODUCING_IND = 'Y' for 82 producing WKs
UPDATE "LAND_RIGHT"
SET "PRODUCING_IND" = 'Y',
    "ROW_CHANGED_BY" = 'MIGRATION_020',
    "ROW_CHANGED_DATE" = CURRENT_DATE
WHERE "LAND_RIGHT_ID" IN (
    'WK1355', 'WK1010', 'WK1011', 'WK1014', 'WK1015', 'WK1019',
    'WK1020', 'WK1398', 'WK1423', 'WK1241', 'WK1026', 'WK1028',
    'WK1032', 'WK1034', 'WK1035', 'WK1007', 'WK1334', 'WK1045',
    'WK1048', 'WK1051', 'WK1052', 'WK1392', 'WK1053', 'WK1162',
    'WK1055', 'WK1056', 'WK1058', 'WK1239', 'WK1164', 'WK1061',
    'WK1287', 'WK1063', 'WK1094', 'WK1065', 'WK1328', 'WK1066',
    'WK1067', 'WK1071', 'WK1073', 'WK1074', 'WK1075', 'WK1079',
    'WK1008', 'WK1089', 'WK1093', 'WK1095', 'WK1096', 'WK1097',
    'WK1100', 'WK1220', 'WK1427', 'WK1102', 'WK1171', 'WK1104',
    'WK1106', 'WK1107', 'WK1110', 'WK1112', 'WK1040', 'WK1244',
    'WK1116', 'WK1118', 'WK1119', 'WK1120', 'WK1399', 'WK1121',
    'WK1366', 'WK1125', 'WK1050', 'WK1080', 'WK1128', 'WK1132',
    'WK1133', 'WK1156', 'WK1135', 'WK1136', 'WK1137', 'WK1169',
    'WK1140', 'WK1141', 'WK1142', 'WK1143'
)
  AND "ACTIVE_IND" = 'Y';

-- UPDATE PRODUCING_IND = 'N' for 73 non-producing WKs (exploration + development)
UPDATE "LAND_RIGHT"
SET "PRODUCING_IND" = 'N',
    "ROW_CHANGED_BY" = 'MIGRATION_020',
    "ROW_CHANGED_DATE" = CURRENT_DATE
WHERE "LAND_RIGHT_ID" IN (
    'WK1401', 'WK1402', 'WK1325', 'WK1405', 'WK1417', 'WK1002',
    'WK1004', 'WK1386', 'WK1380', 'WK1012', 'WK1152', 'WK1404',
    'WK1016', 'WK1416', 'WK1422', 'WK1411', 'WK1025', 'WK1029',
    'WK1407', 'WK1031', 'WK1415', 'WK1149', 'WK1387', 'WK1381',
    'WK1410', 'WK1382', 'WK1312', 'WK1418', 'WK1419', 'WK1044',
    'WK1246', 'WK1268', 'WK1277', 'WK1262', 'WK1234', 'WK1408',
    'WK1294', 'WK1177', 'WK1413', 'WK1308', 'WK1255', 'WK1390',
    'WK1069', 'WK1412', 'WK1302', 'WK1403', 'WK1368', 'WK1257',
    'WK1090', 'WK1092', 'WK1424', 'WK1425', 'WK1409', 'WK1384',
    'WK1406', 'WK1426', 'WK1259', 'WK1364', 'WK1397', 'WK1198',
    'WK1274', 'WK1414', 'WK1389', 'WK1201', 'WK1275', 'WK1202',
    'WK1222', 'WK1223', 'WK1207', 'WK1167', 'WK1160', 'WK1395',
    'WK1385'
)
  AND "ACTIVE_IND" = 'Y';

-- Verification: count by PRODUCING_IND status
DO $$
DECLARE
    y_count INTEGER;
    n_count INTEGER;
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO y_count FROM "LAND_RIGHT" 
        WHERE "ACTIVE_IND" = 'Y' AND "PRODUCING_IND" = 'Y';
    SELECT COUNT(*) INTO n_count FROM "LAND_RIGHT" 
        WHERE "ACTIVE_IND" = 'Y' AND "PRODUCING_IND" = 'N';
    SELECT COUNT(*) INTO null_count FROM "LAND_RIGHT" 
        WHERE "ACTIVE_IND" = 'Y' AND "PRODUCING_IND" IS NULL;
    
    RAISE NOTICE 'Post-update state (active WK only):';
    RAISE NOTICE '  PRODUCING_IND = Y: % WK (target: 82)', y_count;
    RAISE NOTICE '  PRODUCING_IND = N: % WK (target: 73)', n_count;
    RAISE NOTICE '  PRODUCING_IND NULL: % WK (target: 0)', null_count;
    
    IF y_count != 82 OR n_count != 73 OR null_count != 0 THEN
        RAISE WARNING 'Post-update counts do not match expected values!';
    END IF;
END $$;

COMMIT;

-- Verification queries (run separately):
--
-- 1. Overall distribution:
-- SELECT "PRODUCING_IND", COUNT(*) FROM "LAND_RIGHT" WHERE "ACTIVE_IND"='Y' GROUP BY 1;
--
-- 2. Sample producers:
-- SELECT lr."LAND_RIGHT_ID", la."ALIAS_LONG_NAME" 
-- FROM "LAND_RIGHT" lr JOIN "LAND_ALIAS" la USING ("LAND_RIGHT_ID","LAND_RIGHT_SUBTYPE")
-- WHERE lr."PRODUCING_IND"='Y' LIMIT 10;
--
-- 3. Sample non-producers:
-- SELECT lr."LAND_RIGHT_ID", la."ALIAS_LONG_NAME"
-- FROM "LAND_RIGHT" lr JOIN "LAND_ALIAS" la USING ("LAND_RIGHT_ID","LAND_RIGHT_SUBTYPE")
-- WHERE lr."PRODUCING_IND"='N' LIMIT 10;

-- Rollback (if needed - reverts all PRODUCING_IND to NULL):
-- BEGIN;
-- UPDATE "LAND_RIGHT" SET "PRODUCING_IND" = NULL
-- WHERE "ROW_CHANGED_BY" = 'MIGRATION_020';
-- COMMIT;
