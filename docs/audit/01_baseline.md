## Naming Convention

DBEP-Next mengikuti PPDM 3.9 naming convention:

- **Table names: UPPERCASE** (e.g., `LAND_RIGHT`, `RESENT_VOL_SUMMARY`)
- **Column names: UPPERCASE** (e.g., `LAND_RIGHT_ID`, `BUSINESS_ASSOCIATE_ID`)
- **Reference tables: prefix `R_`** (e.g., `R_BA_TYPE`, `R_DOCUMENT_TYPE`)
- **Audit mirror tables: prefix `RA_`** (jika ada, belum verified)

### ⚠️ Critical Rule untuk Query

Karena PostgreSQL case-folding behavior, **SEMUA query ke DBEP-Next WAJIB
pakai double quotes** untuk nama tabel dan kolom:

```sql
-- WRONG (akan error "relation does not exist")
SELECT * FROM public.land_right;

-- CORRECT (case-sensitive match)
SELECT * FROM "public"."LAND_RIGHT";
-- atau
SELECT * FROM "LAND_RIGHT";
```

Implikasi untuk aplikasi:

- FastAPI ORM/query builder harus configured untuk preserve case
- Raw SQL queries must use double quotes consistently
- Migration scripts harus konsisten dengan pattern ini

# DBEP-Next Pre-Migration Audit — Baseline

**Tanggal**: 23 April 2026
**Auditor**: Heru Murdhaningrat
**Sprint**: 1 — Data Quality Audit
**Project**: zoyalstfafhesofjgyvw (Supabase, region ap-northeast-2)

## Informasi Database

| Item                   | Detail                      |
| ---------------------- | --------------------------- |
| **PostgreSQL version** | 17.6                        |
| **Architecture**       | aarch64 (ARM)               |
| **Compiler**           | GCC 15.2.0                  |
| **Database size**      | 75 MB (metadata only)       |
| **Hosting**            | Supabase Cloud              |
| **Search path**        | "$user", public, extensions |

## Schema Layout

Database DBEP-Next menggunakan schema `public` untuk semua data business.

| Schema                      | Fungsi                              | Portable ke Vanilla PostgreSQL? |
| --------------------------- | ----------------------------------- | ------------------------------- |
| `public`                    | ✅ Data DBEP-Next (PPDM 3.9 tables) | Ya                              |
| `extensions`                | PostgreSQL extensions               | Ya                              |
| `topology`                  | PostGIS topology                    | Ya                              |
| `auth`                      | Supabase GoTrue                     | ❌ Diganti Keycloak             |
| `storage`                   | Supabase Storage metadata           | ❌ Diganti MinIO                |
| `realtime`                  | Supabase realtime                   | ❌ Tidak dipakai DBEP-Next      |
| `graphql`, `graphql_public` | pg_graphql                          | ❌ Tidak dipakai DBEP-Next      |
| `vault`                     | Supabase Vault                      | ❌ Diganti HashiCorp Vault      |
| `pgbouncer`                 | Connection pooler                   | ✅ Install terpisah di on-prem  |

## Extensions Installed

| Extension          | Version | Portable? | Keterangan                             |
| ------------------ | ------- | --------- | -------------------------------------- |
| postgis            | 3.3.7   | ✅        | Spatial data (WK + basin polygon)      |
| postgis_topology   | 3.3.7   | ✅        | Topology (not critical)                |
| pgcrypto           | 1.3     | ✅        | Cryptographic functions                |
| uuid-ossp          | 1.1     | ✅        | UUID generation                        |
| pg_stat_statements | 1.11    | ✅        | Query performance monitoring           |
| plpgsql            | 1.0     | ✅        | Procedural language                    |
| pg_graphql         | 1.5.11  | ❌        | Supabase-only, tidak dipakai DBEP-Next |
| supabase_vault     | 0.3.1   | ❌        | Supabase-only, akan diganti            |

**⚠️ Missing extension**: `pgvector` — tidak terinstall. Perlu klarifikasi apakah akan dipakai untuk SIGMA RAG.

## Naming Convention

DBEP-Next mengikuti PPDM 3.9 naming convention:

- Table names: **UPPERCASE** (e.g., `LAND_RIGHT`, `RESENT_VOL_SUMMARY`)
- Column names: **UPPERCASE** (e.g., `LAND_RIGHT_ID`, `BUSINESS_ASSOCIATE_ID`)
- Reference tables: prefix `R_` (e.g., `R_BA_TYPE`, `R_LAND_RIGHT_CATEGORY`)

### ⚠️ Critical Query Rule

Karena PostgreSQL auto-folds unquoted identifiers ke lowercase, **semua query
wajib pakai double quotes**:

```sql
-- SALAH: PostgreSQL cari 'land_right' yang tidak ada
SELECT * FROM public.land_right;

-- BENAR: case-sensitive match
SELECT * FROM "public"."LAND_RIGHT";
```

## Catatan Penting untuk Migrasi

### PostgreSQL Version

Cloud: **PostgreSQL 17.6** (paling baru, released Sep 2024).

**Decision untuk on-prem**:

- Option A: PostgreSQL 17 (konsisten dengan cloud, feature-rich, tapi kurang mature di production)
- Option B: PostgreSQL 16 (lebih mature, lebih banyak experience IT, proven)

**Rekomendasi**: Diskusikan dengan IT SKK Migas. Kalau mereka sudah punya experience PostgreSQL, tanyakan preferensi mereka.

### Architecture

Cloud: ARM (aarch64). Kemungkinan on-prem: x86_64.

**Migrasi cross-architecture OK** karena `pg_dump` text-based. Tapi cross-check:

- PostGIS binary untuk x86_64 harus di-install terpisah
- pgvector (jika dipakai nanti) juga per-architecture

### Database Size

Hanya **75 MB metadata**. Dokumen PDF aktual disimpan terpisah.
**Pending clarification**: Apakah di Supabase Storage atau file server external?

## Pertanyaan Terbuka untuk Sprint Berikutnya

1. Apakah pgvector akan di-install untuk SIGMA RAG?
2. Di mana dokumen PDF aktual disimpan?
3. Versi PostgreSQL target on-prem: 16 atau 17?
4. Target architecture on-prem: x86_64 atau ARM?

## Next Step

**Sprint 1 Hari 2**: Constraint coverage audit

- Query 3 corrected (top 30 tables by volume)
- Query 4 (constraint per table)
- Query 5 (orphan records check)

## Constraint Coverage Analysis

### Summary

| Constraint Type   | Coverage            | Status      |
| ----------------- | ------------------- | ----------- |
| Primary Key       | 30/30 tables (100%) | ✅ Complete |
| Foreign Key       | 5/30 tables (17%)   | ⚠️ Partial  |
| Check Constraint  | 24/30 tables (80%)  | ✅ Mostly   |
| Unique Constraint | 0/30 tables         | Not used    |

### Foreign Key Distribution

Hanya 5 tabel yang punya FK applied:

| Tabel               | FK Count | Module  |
| ------------------- | -------- | ------- |
| RESENT_VOL_SUMMARY  | 5        | Reserve |
| SP_BOUNDARY         | 3        | Spatial |
| RESENT_PRODUCT      | 1        | Reserve |
| SP_POLYGON          | 1        | Spatial |
| SPATIAL_DESCRIPTION | 1        | Spatial |

### FK Gap Analysis

**26 tabel aktif dengan 0 FK** perlu remediation. Priority ranking:

**Tier 1 — Master data (must fix)**:

- LAND_RIGHT, LAND_ALIAS
- BUSINESS_ASSOCIATE, BA_ALIAS
- FIELD, FIELD_COMPONENT
- OBLIGATION, OBLIGATION_COMPONENT
- RESERVE_ENTITY
- INT_SET_PARTNER, INT_SET_COMPONENT, INTEREST_SET

**Tier 2 — Document module (should fix)**:

- RM_DOCUMENT, RM_INFORMATION_ITEM, RM_INFO_ITEM_CONTENT

**Tier 3 — Reference tables (nice to have)**:

- Semua R\_\* tables (low risk, low impact)

### Check Constraint Observations

CK coverage bervariasi — 80% tabel punya setidaknya 1 CK.
Top 3 dengan CK terbanyak:

- SPATIAL_DESCRIPTION: 22 CK (heavy validation spatial)
- LAND_RIGHT: 11 CK (bisnis validation banyak)
- OBLIGATION_COMPONENT, INT_SET_PARTNER, RM_INFO_ITEM_CONTENT: 7 CK each

Tabel tanpa CK:

- CEKUNGAN (custom table, not PPDM)
- SP_BOUNDARY, SP_POLYGON (spatial, validation via PostGIS)

### Root Cause Hypothesis

Pattern FK applied di `RESENT_*` dan `SP_*` vs tidak di modul lain
kemungkinan karena **ETL loader berbeda**:

- Loader A (SQL-based) untuk Reserve + Spatial → preserve FK
- Loader B (custom script) untuk modul lain → skip FK for speed

Ini pattern normal di migrasi dari system legacy.

## Orphan Records Analysis

### Summary

**Hasil**: 0 orphan records ditemukan di 10 relasi critical.

| FK Relation                                | Child Rows | Orphans | Status          |
| ------------------------------------------ | ---------- | ------- | --------------- |
| LAND_ALIAS → LAND_RIGHT                    | 732        | 0       | ✅ Safe         |
| FIELD_COMPONENT → FIELD                    | 1,012      | 0       | ✅ Safe         |
| OBLIGATION_COMPONENT → OBLIGATION          | 1,450      | 0       | ✅ Safe         |
| INT_SET_PARTNER.PARTNER_BA_ID → BA         | 847        | 0       | ✅ Safe         |
| INT_SET_PARTNER → INTEREST_SET             | 847        | 0       | ✅ Safe         |
| INT_SET_COMPONENT → INTEREST_SET           | 711        | 0       | ✅ Safe         |
| RM_DOCUMENT → RM_INFORMATION_ITEM          | 16,793     | 0       | ✅ Safe         |
| RM_INFO_ITEM_CONTENT → RM_INFORMATION_ITEM | 16,793     | 0       | ✅ Safe         |
| BA_ALIAS → BUSINESS_ASSOCIATE              | 0          | 0       | ✅ Safe (empty) |
| RESERVE_ENTITY.CREATED_BY_BA_ID → BA       | 0          | 0       | ✅ Safe (empty) |

### Findings

**1. Data Integrity Excellent**

Meskipun FK constraint tidak di-apply di database level, ETL DBEP-Next
menjaga referential integrity dengan disiplin. 0 orphan di 8 relasi aktif
membuktikan kualitas proses ETL.

**2. Empty Audit Columns**

`RESERVE_ENTITY.CREATED_BY_BA_ID` kosong untuk semua 22,921 rows.
Kemungkinan kolom audit lain (LAST_UPDATE_BA_ID, LAST_APPROVE_BA_ID) juga kosong.

**Action item**: Saat ETL future, populate kolom audit ini untuk compliance.

**3. BA_ALIAS Empty**

Tabel BA_ALIAS belum terisi. Saat integrasi LDAP/AD, tabel ini akan
di-populate untuk map AD users ke BUSINESS_ASSOCIATE.

### Conclusion

**Semua 10 FK priority dapat di-apply tanpa cleanup.**

Sprint 2 (FK application) dapat dimulai langsung.

## Sprint 1 Summary

### Timeline

- **Day 1** (23 Apr 2026): Baseline audit - DB info, extensions, schema
- **Day 2** (23 Apr 2026): Constraint coverage audit
- **Day 3** (23 Apr 2026): Orphan records check
- **Day 5** (23 Apr 2026): First FK applied (FC_F_FK)

### Deliverables

1. **Audit baseline document** — this file
2. **Migration 010** — `database/migrations/010_apply_field_component_fk.sql`
3. **FK deployed** — FIELD_COMPONENT.FIELD_ID → FIELD.FIELD_ID active

### Key Findings

✅ **Good news**:

- PostgreSQL 17.6 aarch64, 75 MB metadata-only database
- 100% PK coverage on all 30 active tables
- 0 orphan records across 10 critical FK relations
- ETL quality excellent (integrity maintained at application level)
- All app pages working post-FK application

⚠️ **Needs attention**:

- Only 5/30 tables have FK applied (17% coverage)
- 22 FKs still needed in subsequent sprints
- Dead rows 22-25% in INTEREST_SET family (VACUUM needed)
- pgvector extension missing (needed for SIGMA RAG)
- Empty audit columns (BA_ALIAS, RESERVE_ENTITY.CREATED_BY_BA_ID)

### Pre-existing Bugs Noted (Not from FK)

- **Map tooltip z-ordering**: WK1427 Pertamina EP (113,629 km² consolidated
  asset) overlaps smaller WKs, tooltip picks largest polygon first.
  Example: hovering WK1120 Senoro-Toili area shows WK1427 Pertamina EP.
  → To be fixed in dedicated map sprint.

### Next Steps

**Sprint 2** (1 week): Apply remaining 9 safe FKs

- 011: LAND_ALIAS → LAND_RIGHT (composite)
- 012: BA_ALIAS → BUSINESS_ASSOCIATE
- 013: OBLIGATION_COMPONENT → OBLIGATION (composite)
- 014: INT_SET_PARTNER → BA + INTEREST_SET (2 FKs)
- 015: INT_SET_COMPONENT → INTEREST_SET
- 016: RM_DOCUMENT → RM_INFORMATION_ITEM (composite)
- 017: RM_INFO_ITEM_CONTENT → RM_INFORMATION_ITEM (composite)

**Sprint 3+**: Reference FKs (R\_\* tables), CK constraints, UOM framework

## Sprint 2 Progress

### Migration 011 - Alias FKs (COMPLETE)

**Applied 2 FKs**:

| FK Name   | Relation                      | Type                     | Status  |
| --------- | ----------------------------- | ------------------------ | ------- |
| LA_LR_FK  | LAND_ALIAS → LAND_RIGHT       | Composite (SUBTYPE + ID) | Applied |
| BAA_BA_FK | BA_ALIAS → BUSINESS_ASSOCIATE | Simple                   | Applied |

**Data state at apply**:

- LAND_ALIAS: 732 rows (6 more than Sprint 1 audit of 726)
- BA_ALIAS: 0 rows (FK for future-proofing)

**App regression test**: Passed on 7 pages.

**Bug discovered during test** (NOT caused by FK):

- Dashboard KPI "155 WK Aktif / Sedang berproduksi" is misleading
- Root cause: PRODUCING_IND all NULL in LAND_RIGHT
- Source data exists in List_WK_Migas_Status_1_Februari_2026.xlsx
- To be fixed in Migration 020 (data reconciliation track)

**Excel source data reveals** (for 160 WK records):

- 82 WK PRODUKSI (producing)
- 24 WK PENGEMBANGAN (development)
- 54 WK NON-PRODUKSI (non-producing, exploration)

### Sprint 2 Remaining

- Migration 012: Interest Set family FKs (3 FK)
- Migration 013: Records Management FKs (2 FK)
- Migration 014: Obligation Component FK (1 FK)

### Data Reconciliation Track (Separate from FK Work)

- Migration 020: Populate PRODUCING_IND from Excel 1 Feb 2026
