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
