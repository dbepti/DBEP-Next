# ADR-001: Strict PPDM 3.9 Schema Compliance

**Status**: Accepted  
**Date**: 2026-04-23  
**Author**: Heru Murdhaningrat (Gisconnect)  
**Decider**: Heru Murdhaningrat  
**Project**: DBEP-Next (Database Eksplorasi & Produksi Next Generation)

---

## Context

DBEP-Next adalah sistem petroleum data management yang dibangun untuk SKK Migas
sebagai bagian dari inisiatif Spektrum IOG 4.0. Sistem ini dirancang di atas
skema PPDM 3.9 (Professional Petroleum Data Management) yang merupakan industry
standard untuk oil & gas upstream data management.

Selama pengembangan aplikasi, sering kali muncul kebutuhan akan kolom atau
tabel baru untuk keperluan business logic spesifik DBEP-Next. Contoh kasus:

- Dashboard memerlukan breakdown status WK (Produksi, Pengembangan, Eksplorasi)
  yang lebih granular daripada yang disediakan kolom `PRODUCING_IND` PPDM.
- Application UI memerlukan label/status field untuk display purposes.
- Integrasi dengan Excel source data kadang memiliki field yang tidak ada
  match langsung di PPDM 3.9.

Godaan untuk menambahkan kolom custom (misal `WK_STAGE`) atau tabel custom
(misal `WK_STATUS_HISTORY`) sangat tinggi karena terasa sebagai solusi paling
langsung.

## Decision

**DBEP-Next schema WAJIB 100% compliant dengan PPDM 3.9 standard. Tidak boleh
ada modifikasi terhadap struktur tabel PPDM 3.9.**

### Yang DILARANG

- ❌ `ALTER TABLE` untuk menambahkan kolom custom ke tabel PPDM 3.9
- ❌ `ALTER TABLE` untuk memodifikasi tipe data atau constraint kolom PPDM
- ❌ `CREATE TABLE` untuk tabel custom di luar skema PPDM 3.9 (contoh:
  `WK_STATUS_HISTORY`, `DOCUMENT_TYPE_CUSTOM`, `USER_PREFERENCES`)
- ❌ `DROP` kolom PPDM 3.9 meskipun tidak terpakai

### Yang DIPERBOLEHKAN

- ✅ `CREATE VIEW` untuk derived representation dari tabel PPDM
  - Contoh: `v_wk_lengkap`, `v_stats_kpi_header`, `v_dokumen`
  - Views adalah query-time computation, tidak mengubah schema
- ✅ `CREATE MATERIALIZED VIEW` untuk performance optimization
  - Contoh: `mv_wk_basin_mapping`
  - Storage-nya terpisah, tidak mengubah tabel sumber

- ✅ Populasi data ke kolom PPDM yang sudah ada
  - Contoh: Migration 020 (populate `PRODUCING_IND`)
  - Contoh: Migration 009 (populate `LAND_RIGHT_CATEGORY`)

- ✅ `CREATE INDEX` untuk performance tuning
  - Indeks adalah metadata optimization, tidak ubah schema

- ✅ Foreign Key, Primary Key, Check Constraint yang sudah didefinisikan PPDM
  - Migration 010, 011, 012+ hanya apply constraint yang seharusnya ada

- ✅ Penambahan reference data ke tabel `R_*` (reference tables PPDM)
  - Contoh: insert baru di `R_DOCUMENT_TYPE`, `R_BA_TYPE`
  - Reference tables memang designed untuk extensible data

- ✅ Skema auxiliary di schema terpisah
  - Contoh: schema `audit` untuk audit logs (kalau nanti dibutuhkan)
  - Tidak boleh di schema `public` (yang reserved untuk PPDM)

### Exception Clause

Kalau ada kebutuhan yang benar-benar tidak bisa di-derive dari PPDM 3.9:

1. Dokumentasikan di ADR baru dengan justifikasi lengkap
2. Diskusikan dengan team minimal 1 orang lagi (bukan self-decision)
3. Pertimbangkan 3 alternatif sebelum memilih add custom column/table
4. Kalau tetap perlu, gunakan schema terpisah (bukan `public`)
5. Namespace yang jelas (prefix `DBEP_` misalnya) untuk distinguish dari PPDM

## Consequences

### Positive

1. **Interoperability**: Data bisa di-exchange dengan 50 KKKS yang juga
   adopt PPDM 3.9 tanpa translation layer.

2. **Future-proof**: Saat ada update PPDM (misal versi 3.10), migrasi lebih
   straightforward karena tidak ada custom schema yang perlu di-reconcile.

3. **Audit-friendly**: SKK Migas IT dan auditor eksternal bisa easily verify
   compliance dengan standard. Tidak ada surprise saat on-premise audit.

4. **Developer discipline**: Memaksa team untuk berpikir lebih lanjut tentang
   data modeling, menggunakan PPDM semantics yang sudah dipikirkan matang.

5. **Documentation built-in**: PPDM 3.9 punya dokumentasi lengkap untuk setiap
   kolom. Kalau kita reuse kolom PPDM, dokumentasinya sudah ada.

### Negative

1. **Inconvenience**: Kadang butuh effort lebih untuk derive data via view
   daripada simply add column.

2. **Learning curve**: Developer harus familiar dengan PPDM 3.9 terminology
   dan semantics.

3. **View maintenance**: Views butuh maintenance saat tabel sumber berubah
   (meski ini minor).

4. **Potential performance**: Computed views bisa lebih lambat daripada
   stored columns. Harus di-benchmark dan di-optimize kalau bottleneck.

### Mitigations

- **For complex derivations**: Gunakan materialized view yang di-refresh
  periodically (misal nightly).
- **For performance**: Add proper indexes pada kolom-kolom yang dipakai
  di view WHERE clauses.
- **For onboarding**: Maintain dokumentasi PPDM 3.9 mapping di `docs/`
  dan training internal.

## Historical Context

Keputusan ini diambil setelah diskusi pada Sprint 2 Migration 011 (23 April 2026),
saat muncul kebutuhan untuk breakdown status WK di dashboard menjadi Produksi,
Pengembangan, dan Eksplorasi. Awalnya propose untuk menambah kolom custom
`WK_STAGE`, tapi setelah diskusi, disimpulkan bahwa approach ini violasi
prinsip strict PPDM compliance yang sudah implicit dari awal project.

## Examples Applied

### Example 1: Dashboard WK Status Breakdown

**Need**: Dashboard menampilkan breakdown Produksi (82) vs Non-Produksi (73).

**Wrong approach** (violates ADR):

```sql
ALTER TABLE "LAND_RIGHT" ADD COLUMN "WK_STAGE" VARCHAR(20);
```

**Correct approach** (follows ADR):

```sql
CREATE OR REPLACE VIEW v_stats_kpi_header AS
SELECT
    COUNT(*) FILTER (WHERE "ACTIVE_IND"='Y') AS wk_aktif,
    COUNT(*) FILTER (WHERE "ACTIVE_IND"='Y' AND "PRODUCING_IND"='Y') AS wk_producing,
    COUNT(*) FILTER (WHERE "ACTIVE_IND"='Y' AND "PRODUCING_IND"='N') AS wk_not_producing,
    ...
FROM "LAND_RIGHT";
```

### Example 2: Status Audit Trail

**Need**: Track history perubahan status WK.

**Wrong approach** (violates ADR):

```sql
CREATE TABLE "WK_STATUS_HISTORY" (...);
```

**Correct approach** (follows ADR):

- Use existing PPDM `ROW_CHANGED_BY`, `ROW_CHANGED_DATE`, `ROW_EFFECTIVE_DATE`,
  `ROW_EXPIRY_DATE` columns pada tabel PPDM
- Or use PPDM `LAND_STATUS` table (kalau sudah ada) untuk status history

### Example 3: Development vs Exploration Breakdown

**Need**: Distinguish 24 Pengembangan vs 49 Eksplorasi di dashboard.

**Wrong approach** (violates ADR):

```sql
ALTER TABLE "LAND_RIGHT" ADD COLUMN "DEVELOPMENT_STAGE" VARCHAR(20);
```

**Correct approach** (follows ADR):

```sql
-- Derive dari kombinasi PPDM columns + document existence
CREATE VIEW v_wk_operational_stage AS
SELECT
    lr."LAND_RIGHT_ID",
    CASE
        WHEN lr."PRODUCING_IND"='Y' THEN 'PRODUCING'
        WHEN lr."ACTIVE_IND"='Y' AND lr."PRODUCING_IND"='N'
             AND EXISTS (
                 SELECT 1 FROM "RM_INFORMATION_ITEM" ii
                 WHERE ii."ITEM_CATEGORY"='POD' AND ...
             ) THEN 'DEVELOPMENT'
        WHEN lr."ACTIVE_IND"='Y' AND lr."PRODUCING_IND"='N' THEN 'EXPLORATION'
        WHEN lr."ACTIVE_IND"='N' THEN 'TERMINATED'
    END AS stage
FROM "LAND_RIGHT" lr;
```

## Known Limitations & Future Considerations

### Dashboard Stage Breakdown (April 2026)

**Limitation**: Dashboard saat ini menampilkan breakdown WK Aktif sebagai
"82 WK Produksi, 73 WK Belum Produksi" tanpa membedakan WK Pengembangan
vs WK Eksplorasi.

**Why**: Data untuk distinguish stage Pengembangan vs Eksplorasi tidak
fully tersedia di PPDM 3.9 columns yang sudah populated:

- `LAND_RIGHT.FIRST_PRODUCTION_DATE`: Semua NULL untuk 73 WK non-producing
- `RM_INFORMATION_ITEM.ITEM_CATEGORY`: Semua NULL (16,793 documents)
- POD documents linked ke WK aktif non-producing: hanya 2 dari 24 expected

**Source of Truth**: Excel `List_WK_Migas_Status_1_Februari_2026.xlsx`
memiliki kolom `FASE WK` (EKSPLOITASI/EKSPLORASI) dan `STATUS PRODUKSI`
(PRODUKSI/PENGEMBANGAN/NON-PRODUKSI) yang authoritative, tetapi importing
ini sebagai lookup table akan butuh evaluasi terhadap ADR-001 (kemungkinan
acceptable di schema terpisah seperti `dbep_app`).

**Future resolution paths** (to be evaluated):

1. **PCM Integration**: Saat PSC Contract Management system terintegrasi
   dengan DBEP-Next, derive stage dari PCM data.

2. **POD Document Reconciliation**: ETL untuk link semua POD documents
   yang existing ke WK yang tepat. Akan improve accuracy derivation
   via POD presence.

3. **FIRST_PRODUCTION_DATE Population**: Migration untuk populate kolom
   ini dari authoritative source (SCU/PUDC integration atau Excel update).

4. **Auxiliary Schema** (`dbep_app`): Kalau path 1-3 tidak feasible
   dalam waktu dekat, evaluate creating auxiliary schema dengan rules ketat
   (separate dari `public`, namespaced, documented).

**Status**: Defer hingga ada salah satu data integration di atas, atau
kebutuhan business yang strong untuk granular breakdown.

### Other Known Data Gaps (Discovered April 2026)

| Tabel               | Kolom                 | Status                 | Impact                                            |
| ------------------- | --------------------- | ---------------------- | ------------------------------------------------- |
| LAND_RIGHT          | FIRST_PRODUCTION_DATE | All NULL (73 WK)       | Cannot derive operational stage                   |
| RM_INFORMATION_ITEM | ITEM_CATEGORY         | All NULL (16,793 rows) | Document categorization via DOCUMENT_TYPE instead |
| RESERVE_ENTITY      | CREATED_BY_BA_ID      | All NULL (22,921 rows) | No audit trail                                    |
| RESERVE_ENTITY      | LAST_UPDATE_BA_ID     | All NULL               | No update tracking                                |
| RESERVE_ENTITY      | LAST_APPROVE_BA_ID    | All NULL               | No approval trail                                 |
| BA_ALIAS            | (entire table)        | 0 rows                 | LDAP integration pending                          |

**Pattern**: ETL initial fokus pada data struktural (WK, KKKS, dokumen
metadata). Operational state, audit trail, dan user mapping di-skip
karena prioritas atau keterbatasan source data.

**Resolution strategy**:

- Audit trail columns akan auto-populate saat aplikasi user mulai modify
  data post-migration
- BA_ALIAS akan populate saat integrasi LDAP/AD
- Operational state butuh authoritative source (PCM, SCU/PUDC, atau Excel)

## References

- PPDM 3.9 Schema Documentation: `01PPDM39_TAB.SQL`, `02PPDM39_PK.SQL`
- Anthropic AI guidance on PPDM compliance (chat history)
- SKK Migas Spektrum IOG 4.0 standards: SIGI v2.0, SPARK v2.0, PRMS 2018
- Indonesian regulation: Permen ESDM 7/2019, PTK 055
