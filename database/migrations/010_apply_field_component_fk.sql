-- Migration 010: Apply FK FIELD_COMPONENT -> FIELD
-- Sprint: 1 (Pre-Migration Data Quality Audit)
-- Date: 2026-04-23
-- Author: Heru Murdhaningrat
-- Purpose: First FK application as Sprint 1 proof-of-concept
--
-- Background:
--   DBEP-Next has 100% PK coverage but only 17% FK coverage (5/30 active tables).
--   This migration starts the systematic FK application process.
--
-- Prerequisites (verified in docs/audit/01_baseline.md):
--   - 0 orphan records in FIELD_COMPONENT.FIELD_ID (Query 5 result)
--   - FIELD has PK on FIELD_ID (verified Query 4)
--   - FIELD: 1,012 rows, FIELD_COMPONENT: 1,012 rows (1:1 ratio)
--
-- Testing performed:
--   - Test A: Valid insert (FIELD_ID = 'LAP1473') succeeded
--   - Test B: Invalid insert rejected with error 23503 (FK violation)
--   - Test C: All 7 DBEP-Next pages load normally post-apply
--   - Verified: is_validated = true (all 1,012 existing rows check out)
--
-- Next FKs in queue (for future migrations):
--   011: LAND_ALIAS -> LAND_RIGHT (composite: SUBTYPE + ID)
--   012: BA_ALIAS -> BUSINESS_ASSOCIATE
--   013: OBLIGATION_COMPONENT -> OBLIGATION (composite)
--   014: INT_SET_PARTNER -> BUSINESS_ASSOCIATE + INTEREST_SET
--   015: INT_SET_COMPONENT -> INTEREST_SET
--   016: RM_DOCUMENT -> RM_INFORMATION_ITEM (composite)
--   017: RM_INFO_ITEM_CONTENT -> RM_INFORMATION_ITEM (composite)

BEGIN;

-- Safety check: re-verify 0 orphan records before apply (idempotent safe)
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM "FIELD_COMPONENT" fc
    WHERE fc."FIELD_ID" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "FIELD" f
        WHERE f."FIELD_ID" = fc."FIELD_ID"
      );
    
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 
            'Cannot apply FK FC_F_FK: % orphan records found in FIELD_COMPONENT', 
            orphan_count;
    END IF;
    
    RAISE NOTICE 'Pre-check: 0 orphan records, safe to apply FK';
END $$;

-- Check if FK already exists (idempotent re-apply)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'FC_F_FK' 
          AND conrelid = '"FIELD_COMPONENT"'::regclass
    ) THEN
        RAISE NOTICE 'FK FC_F_FK already exists, skipping';
    ELSE
        -- Apply FK constraint
        ALTER TABLE "FIELD_COMPONENT" 
            ADD CONSTRAINT "FC_F_FK" 
            FOREIGN KEY ("FIELD_ID") 
            REFERENCES "FIELD"("FIELD_ID");
        
        RAISE NOTICE 'FK FC_F_FK applied successfully';
    END IF;
END $$;

COMMIT;

-- Verification (run separately after migration):
-- SELECT conname, pg_get_constraintdef(oid), convalidated
-- FROM pg_constraint 
-- WHERE conrelid = '"FIELD_COMPONENT"'::regclass 
--   AND contype = 'f';

-- Rollback instruction (if ever needed):
-- BEGIN;
-- ALTER TABLE "FIELD_COMPONENT" DROP CONSTRAINT "FC_F_FK";
-- COMMIT;