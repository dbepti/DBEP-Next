-- Migration 011: Apply Alias FKs
-- Sprint: 2 (FK Application - Grouped Migrations)
-- Date: 2026-04-23
-- Author: Heru Murdhaningrat
-- Purpose: Apply FK for LAND_ALIAS and BA_ALIAS tables
--
-- Background:
--   Sprint 1 verified 0 orphan records. This is Sprint 2 first grouped migration.
--
-- FKs applied:
--   1. LA_LR_FK: LAND_ALIAS -> LAND_RIGHT (composite: SUBTYPE + ID)
--   2. BAA_BA_FK: BA_ALIAS -> BUSINESS_ASSOCIATE (simple)
--
-- Pre-checks verified:
--   - LAND_ALIAS: 732 rows, 0 orphan
--   - BA_ALIAS: 0 rows (future-proofing)
--
-- Post-apply verification:
--   - Both FKs is_validated = true
--   - App tested on 7 pages, no regression

BEGIN;

-- Safety check: re-verify orphans (idempotent safe)
DO $$
DECLARE
    orphan_la INTEGER;
    orphan_baa INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_la
    FROM "LAND_ALIAS" la
    WHERE la."LAND_RIGHT_ID" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "LAND_RIGHT" lr
        WHERE lr."LAND_RIGHT_ID" = la."LAND_RIGHT_ID"
          AND lr."LAND_RIGHT_SUBTYPE" = la."LAND_RIGHT_SUBTYPE"
      );
    
    SELECT COUNT(*) INTO orphan_baa
    FROM "BA_ALIAS" baa
    WHERE baa."BUSINESS_ASSOCIATE_ID" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "BUSINESS_ASSOCIATE" ba
        WHERE ba."BUSINESS_ASSOCIATE_ID" = baa."BUSINESS_ASSOCIATE_ID"
      );
    
    IF orphan_la > 0 THEN
        RAISE EXCEPTION 'Cannot apply LA_LR_FK: % orphan records', orphan_la;
    END IF;
    
    IF orphan_baa > 0 THEN
        RAISE EXCEPTION 'Cannot apply BAA_BA_FK: % orphan records', orphan_baa;
    END IF;
    
    RAISE NOTICE 'Pre-check passed';
END $$;

-- Apply FK 1: LAND_ALIAS -> LAND_RIGHT (composite)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'LA_LR_FK' 
          AND conrelid = '"LAND_ALIAS"'::regclass
    ) THEN
        RAISE NOTICE 'FK LA_LR_FK already exists, skipping';
    ELSE
        ALTER TABLE "LAND_ALIAS" 
            ADD CONSTRAINT "LA_LR_FK" 
            FOREIGN KEY ("LAND_RIGHT_SUBTYPE", "LAND_RIGHT_ID") 
            REFERENCES "LAND_RIGHT"("LAND_RIGHT_SUBTYPE", "LAND_RIGHT_ID");
        
        RAISE NOTICE 'FK LA_LR_FK applied';
    END IF;
END $$;

-- Apply FK 2: BA_ALIAS -> BUSINESS_ASSOCIATE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'BAA_BA_FK' 
          AND conrelid = '"BA_ALIAS"'::regclass
    ) THEN
        RAISE NOTICE 'FK BAA_BA_FK already exists, skipping';
    ELSE
        ALTER TABLE "BA_ALIAS" 
            ADD CONSTRAINT "BAA_BA_FK" 
            FOREIGN KEY ("BUSINESS_ASSOCIATE_ID") 
            REFERENCES "BUSINESS_ASSOCIATE"("BUSINESS_ASSOCIATE_ID");
        
        RAISE NOTICE 'FK BAA_BA_FK applied';
    END IF;
END $$;

COMMIT;

-- Verification:
-- SELECT conname, pg_get_constraintdef(oid), convalidated
-- FROM pg_constraint WHERE conname IN ('LA_LR_FK', 'BAA_BA_FK');

-- Rollback (if needed):
-- BEGIN;
-- ALTER TABLE "LAND_ALIAS" DROP CONSTRAINT "LA_LR_FK";
-- ALTER TABLE "BA_ALIAS" DROP CONSTRAINT "BAA_BA_FK";
-- COMMIT;