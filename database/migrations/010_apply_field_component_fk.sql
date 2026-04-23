-- Migration 010: Apply FK FIELD_COMPONENT → FIELD
-- Sprint: 1 (Pre-Migration Data Quality Audit)
-- Date: 2026-04-23
-- Author: Heru Murdhaningrat
-- Purpose: First FK application as Sprint 1 proof-of-concept
-- 
-- Prerequisites (verified in audit):
--   - 0 orphan records in FIELD_COMPONENT.FIELD_ID
--   - FIELD table has PK on FIELD_ID
--   - FIELD has 1,012 rows, FIELD_COMPONENT has 1,012 rows
--
-- Testing performed:
--   - Pre-apply: verified is_validated=true after apply
--   - Post-apply Test A: valid insert succeeded
--   - Post-apply Test B: invalid insert rejected with error 23503
--
-- Related docs: docs/audit/01_baseline.md

BEGIN;

-- Safety check: re-verify 0 orphan records (idempotent safe apply)
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
END $$;

-- Check if FK already exists (idempotent)
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

-- Verification (run separately):
-- SELECT conname, pg_get_constraintdef(oid), convalidated
-- FROM pg_constraint 
-- WHERE conrelid = '"FIELD_COMPONENT"'::regclass 
--   AND contype = 'f';

-- Rollback instruction (if needed):
-- BEGIN;
-- ALTER TABLE "FIELD_COMPONENT" DROP CONSTRAINT "FC_F_FK";
-- COMMIT;