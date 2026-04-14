# DBEP-Next

**Database Eksplorasi & Produksi — Next Generation**  
SKK Migas · Spektrum IOG 4.0 · PPDM 3.9

---

## Tentang Proyek

DBEP-Next adalah pengganti DBEP (Database Eksplorasi & Produksi) SKK Migas yang dibangun di atas standar data industri hulu migas global **PPDM 3.9**, dengan filosofi UX dari **Paperless-ngx**, dan dirancang untuk **AI-Ready** sejak awal.

### Perbedaan dengan DBEP lama

| Aspek | DBEP Lama | DBEP-Next |
|-------|-----------|-----------|
| Database | Oracle (closed, mahal) | PostgreSQL 16 + pgvector |
| Data Model | Custom tanpa standar | PPDM 3.9 (standar industri global) |
| Backend | PHP | Python + FastAPI |
| Frontend | PHP rendered | Next.js 14 + TypeScript |
| Auth | LDAP langsung | Keycloak + LDAP federation |
| Storage | Nextcloud | MinIO / Supabase Storage |
| Search | Oracle LIKE | PostgreSQL FTS + pgvector (AI semantic) |
| AI | Tidak ada | RAG + LangChain + Ollama (lokal) |

---

## Arsitektur Singkat

```
frontend/    → Next.js 14 + TypeScript + Tailwind
backend/     → FastAPI + SQLAlchemy + Supabase
database/    → PPDM 3.9 PostgreSQL schema + migrations
.devcontainer/ → GitHub Codespaces config
```

### Entitas PPDM39 Utama

- **LAND_RIGHT** ← A01_WK (Wilayah Kerja — entitas inti)
- **BUSINESS_ASSOCIATE** ← A01_KKKS (KKKS/Operator)
- **INT_SET_COMPONENT** ← A01_OPERATORSHIP (relasi WK–KKKS)
- **RM_INFORMATION_ITEM** ← A20_DOC_* (semua dokumen scan)
- **RM_INFO_ITEM_STATUS** ← CHK_* columns (checklist kelengkapan)

---

## Quickstart (GitHub Codespaces)

1. Buka repo ini → klik **Code** → **Codespaces** → **Create codespace**
2. Tunggu setup otomatis (~3 menit)
3. Isi credentials Supabase di `backend/.env` dan `frontend/.env.local`
4. Jalankan database migration:
   ```bash
   psql $DATABASE_URL -f database/migrations/001_ppdm39_schema.sql
   psql $DATABASE_URL -f database/seeds/001_reference_data.sql
   ```
5. Jalankan backend:
   ```bash
   cd backend && uvicorn app.main:app --reload
   ```
6. Jalankan frontend (terminal baru):
   ```bash
   cd frontend && npm run dev
   ```
7. Buka port 3000 → DBEP-Next siap!

---

## API Endpoints

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/wk` | Daftar Wilayah Kerja |
| GET | `/api/wk/{id}` | Detail WK |
| GET | `/api/wk/{id}/dokumen` | Dokumen milik WK |
| GET | `/api/dokumen` | Daftar dokumen (dengan filter) |
| GET | `/api/dokumen/{id}` | Detail dokumen + checklist |
| POST | `/api/dokumen/upload` | Upload dokumen baru |
| GET | `/api/kkks` | Daftar KKKS |
| GET | `/api/search` | Pencarian FTS + Semantic |
| GET | `/api/auth/me` | Info user |

Dokumentasi API lengkap: `http://localhost:8000/docs`

---

## Migrasi ke Server SKK Migas (Production)

Karena Supabase **adalah** PostgreSQL, migrasi ke server internal SKK Migas hanya memerlukan:

```bash
# Export dari Supabase
pg_dump $SUPABASE_DB_URL > dbep_next_backup.sql

# Import ke server SKK Migas
psql $SKK_MIGAS_DB_URL < dbep_next_backup.sql

# Update satu baris di backend/.env
DATABASE_URL=postgresql://user:pass@server-skk-migas:5432/dbep_next
```

Tidak ada perubahan kode apapun.

---

## Roadmap Sprint

- [x] Sprint 1: Repo + Codespaces + Supabase schema
- [ ] Sprint 2: FastAPI backend core + auth
- [ ] Sprint 3: Migrasi data A01_* dari Oracle DBEP
- [ ] Sprint 4: OCR pipeline + document upload
- [ ] Sprint 5: Search (FTS + pgvector AI)
- [ ] Sprint 6: UAT + cutover ke server SKK Migas

---

*SKK Migas · Spektrum IOG 4.0 · PPDM 3.9*
