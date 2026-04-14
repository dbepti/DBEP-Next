-- ============================================================
-- DBEP-Next — Migration 001: PPDM39 Core Schema
-- SKK Migas · Spektrum IOG 4.0
-- PostgreSQL 16 + pgvector
-- ============================================================
-- Jalankan di Supabase SQL Editor atau:
--   psql $DATABASE_URL -f 001_ppdm39_schema.sql
-- ============================================================

-- Enable pgvector untuk AI/semantic search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- PHASE 0 — GLOBAL FOUNDATION
-- Wajib ada sebelum semua tabel lain
-- ============================================================

CREATE TABLE IF NOT EXISTS r_ppdm_row_quality (
    row_quality     VARCHAR(20) PRIMARY KEY,
    abbreviation    VARCHAR(1),
    short_name      VARCHAR(30),
    remark          VARCHAR(2000),
    source          VARCHAR(30) DEFAULT 'SPEKTRUM_SEED'
);

CREATE TABLE IF NOT EXISTS r_source (
    source          VARCHAR(30) PRIMARY KEY,
    short_name      VARCHAR(20),
    remark          VARCHAR(2000)
);

-- ============================================================
-- PHASE 1 — REFERENCE TABLES (subset yang dibutuhkan DBEP)
-- ============================================================

CREATE TABLE IF NOT EXISTS r_ba_type (
    ba_type         VARCHAR(40) PRIMARY KEY,
    short_name      VARCHAR(20),
    remark          VARCHAR(2000),
    source          VARCHAR(30) REFERENCES r_source(source),
    row_quality     VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality)
);

CREATE TABLE IF NOT EXISTS r_land_right_category (
    land_right_category VARCHAR(40) PRIMARY KEY,
    short_name          VARCHAR(20),
    remark              VARCHAR(2000),
    source              VARCHAR(30) REFERENCES r_source(source),
    row_quality         VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality)
);

CREATE TABLE IF NOT EXISTS r_granted_right_type (
    granted_right_type  VARCHAR(40) PRIMARY KEY,
    short_name          VARCHAR(20),
    remark              VARCHAR(2000),
    source              VARCHAR(30) REFERENCES r_source(source),
    row_quality         VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality)
);

CREATE TABLE IF NOT EXISTS r_obligation_category (
    obligation_category VARCHAR(40) PRIMARY KEY,
    short_name          VARCHAR(20),
    remark              VARCHAR(2000),
    source              VARCHAR(30) REFERENCES r_source(source),
    row_quality         VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality)
);

CREATE TABLE IF NOT EXISTS r_rmii_status (
    rmii_status     VARCHAR(40) PRIMARY KEY,
    short_name      VARCHAR(20),
    remark          VARCHAR(2000),
    source          VARCHAR(30) REFERENCES r_source(source),
    row_quality     VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality)
);

-- ============================================================
-- PHASE 3 — CORE DATA TABLES
-- ============================================================

-- M38: BUSINESS_ASSOCIATE (KKKS)
CREATE TABLE IF NOT EXISTS business_associate (
    business_associate_id   VARCHAR(20) PRIMARY KEY,
    ba_type                 VARCHAR(40) REFERENCES r_ba_type(ba_type),
    ba_category             VARCHAR(40),
    ba_long_name            VARCHAR(255),
    ba_short_name           VARCHAR(30),
    active_ind              VARCHAR(1) DEFAULT 'Y',
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    row_created_by          VARCHAR(50),
    row_created_date        TIMESTAMPTZ DEFAULT NOW(),
    row_changed_by          VARCHAR(50),
    row_changed_date        TIMESTAMPTZ DEFAULT NOW()
);

-- BA_ADDRESS (kontak KKKS)
CREATE TABLE IF NOT EXISTS ba_address (
    business_associate_id   VARCHAR(20) REFERENCES business_associate(business_associate_id),
    address_obs_no          INTEGER DEFAULT 1,
    address_type            VARCHAR(20),
    address                 VARCHAR(500),
    phone_num               VARCHAR(30),
    email                   VARCHAR(100),
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    PRIMARY KEY (business_associate_id, address_obs_no)
);

-- BA_ALIAS (nama singkat / holding)
CREATE TABLE IF NOT EXISTS ba_alias (
    business_associate_id   VARCHAR(20) REFERENCES business_associate(business_associate_id),
    ba_alias_id             VARCHAR(30),
    alias_type              VARCHAR(30),
    alias_long_name         VARCHAR(255),
    preferred_ind           VARCHAR(1) DEFAULT 'Y',
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    PRIMARY KEY (business_associate_id, ba_alias_id)
);

-- M12: LAND_RIGHT (Wilayah Kerja — entitas inti)
CREATE TABLE IF NOT EXISTS land_right (
    land_right_subtype      VARCHAR(40) DEFAULT 'ONSHORE_CONCESSION',
    land_right_id           VARCHAR(20),
    land_right_category     VARCHAR(40) REFERENCES r_land_right_category(land_right_category),
    granted_right_type      VARCHAR(40) REFERENCES r_granted_right_type(granted_right_type),
    land_property_type      VARCHAR(40),
    acqtn_date              DATE,
    effective_date          DATE,
    expiry_date             DATE,
    gross_size              NUMERIC(15,4),
    gross_size_ouom         VARCHAR(20) DEFAULT 'km2',
    jurisdiction            VARCHAR(30) DEFAULT 'INDONESIA',
    fractional_interest     NUMERIC(10,8),
    inactivation_date       DATE,
    confidential_ind        VARCHAR(1) DEFAULT 'N',
    remark                  VARCHAR(2000),
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    row_created_by          VARCHAR(50),
    row_created_date        TIMESTAMPTZ DEFAULT NOW(),
    row_changed_by          VARCHAR(50),
    row_changed_date        TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (land_right_subtype, land_right_id)
);

-- LAND_ALIAS (nama WK)
CREATE TABLE IF NOT EXISTS land_alias (
    land_right_subtype      VARCHAR(40),
    land_right_id           VARCHAR(20),
    lr_alias_id             VARCHAR(30),
    alias_type              VARCHAR(30),
    alias_long_name         VARCHAR(255),
    alias_short_name        VARCHAR(30),
    preferred_ind           VARCHAR(1) DEFAULT 'Y',
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    PRIMARY KEY (land_right_subtype, land_right_id, lr_alias_id),
    FOREIGN KEY (land_right_subtype, land_right_id) REFERENCES land_right(land_right_subtype, land_right_id)
);

-- LAND_RIGHT_INSTRUMENT (nomor surat pemerintah)
CREATE TABLE IF NOT EXISTS land_right_instrument (
    land_right_subtype      VARCHAR(40),
    land_right_id           VARCHAR(20),
    instrument_id           VARCHAR(30),
    acqtn_date              DATE,
    reference_num           VARCHAR(100),
    active_ind              VARCHAR(1) DEFAULT 'Y',
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    PRIMARY KEY (land_right_subtype, land_right_id, instrument_id),
    FOREIGN KEY (land_right_subtype, land_right_id) REFERENCES land_right(land_right_subtype, land_right_id)
);

-- M17: INTEREST_SET (kelompok kepemilikan per WK)
CREATE TABLE IF NOT EXISTS interest_set (
    interest_set_id         VARCHAR(30) PRIMARY KEY,
    interest_set_seq_no     INTEGER DEFAULT 1,
    interest_set_type       VARCHAR(40),
    active_ind              VARCHAR(1) DEFAULT 'Y',
    effective_date          DATE,
    expiry_date             DATE,
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality)
);

-- INT_SET_COMPONENT (bridge: LAND_RIGHT ↔ INTEREST_SET + BA)
CREATE TABLE IF NOT EXISTS int_set_component (
    interest_set_id         VARCHAR(30) REFERENCES interest_set(interest_set_id),
    interest_set_seq_no     INTEGER DEFAULT 1,
    component_obs_no        INTEGER,
    land_right_id           VARCHAR(20),
    land_right_subtype      VARCHAR(40),
    business_associate_id   VARCHAR(20) REFERENCES business_associate(business_associate_id),
    interest_set_type       VARCHAR(40),
    active_ind              VARCHAR(1) DEFAULT 'Y',
    effective_date          DATE,
    expiry_date             DATE,
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    PRIMARY KEY (interest_set_id, interest_set_seq_no, component_obs_no)
);

-- M06: CONTRACT
CREATE TABLE IF NOT EXISTS contract (
    contract_id             VARCHAR(25) PRIMARY KEY,
    contract_type           VARCHAR(40),
    contract_name           VARCHAR(100),
    contract_num            VARCHAR(100),
    effective_date          DATE,
    expiry_date             DATE,
    current_status          VARCHAR(30),
    current_status_date     DATE,
    confidential_ind        VARCHAR(1) DEFAULT 'N',
    remark                  VARCHAR(2000),
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    row_created_by          VARCHAR(50),
    row_created_date        TIMESTAMPTZ DEFAULT NOW()
);

-- CONTRACT_COMPONENT (bridge: LAND_RIGHT ↔ CONTRACT)
CREATE TABLE IF NOT EXISTS contract_component (
    contract_id             VARCHAR(25) REFERENCES contract(contract_id),
    component_id            VARCHAR(30),
    land_right_id           VARCHAR(20),
    land_right_subtype      VARCHAR(40),
    active_ind              VARCHAR(1) DEFAULT 'Y',
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    PRIMARY KEY (contract_id, component_id)
);

-- M15: OBLIGATION (kewajiban WP&B)
CREATE TABLE IF NOT EXISTS obligation (
    obligation_id           VARCHAR(30) PRIMARY KEY,
    obligation_seq_no       INTEGER DEFAULT 1,
    obligation_category     VARCHAR(40) REFERENCES r_obligation_category(obligation_category),
    active_ind              VARCHAR(1) DEFAULT 'Y',
    effective_date          DATE,
    expiry_date             DATE,
    gross_obligation_cost   NUMERIC(18,2),
    currency_ouom           VARCHAR(10) DEFAULT 'USD',
    description             VARCHAR(2000),
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality)
);

-- OBLIGATION_COMPONENT (bridge: LAND_RIGHT ↔ OBLIGATION)
CREATE TABLE IF NOT EXISTS obligation_component (
    obligation_id           VARCHAR(30) REFERENCES obligation(obligation_id),
    obligation_seq_no       INTEGER DEFAULT 1,
    component_obs_no        INTEGER DEFAULT 1,
    land_right_id           VARCHAR(20),
    land_right_subtype      VARCHAR(40),
    active_ind              VARCHAR(1) DEFAULT 'Y',
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    PRIMARY KEY (obligation_id, obligation_seq_no, component_obs_no)
);

-- M45: PROJECT (WP&B tahunan)
CREATE TABLE IF NOT EXISTS project (
    project_id              VARCHAR(30) PRIMARY KEY,
    project_type            VARCHAR(40),
    project_name            VARCHAR(200),
    start_date              DATE,
    complete_date           DATE,
    status                  VARCHAR(30),
    remark                  VARCHAR(2000),
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    row_created_date        TIMESTAMPTZ DEFAULT NOW()
);

-- M53: WORK_ORDER (AFE)
CREATE TABLE IF NOT EXISTS work_order (
    work_order_id           VARCHAR(30) PRIMARY KEY,
    project_id              VARCHAR(30) REFERENCES project(project_id),
    work_order_type         VARCHAR(30),
    work_order_number       VARCHAR(100),
    status                  VARCHAR(30),
    approval_date           DATE,
    budget_amount           NUMERIC(18,2),
    approved_amount         NUMERIC(18,2),
    currency_ouom           VARCHAR(10) DEFAULT 'USD',
    remark                  VARCHAR(2000),
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    row_created_date        TIMESTAMPTZ DEFAULT NOW()
);

-- M24: RM_INFORMATION_ITEM (dokumen scan — entitas dokumen utama)
CREATE TABLE IF NOT EXISTS rm_information_item (
    information_item_id     VARCHAR(40) PRIMARY KEY,
    land_right_id           VARCHAR(20),          -- DBEP_DOC_ID → link ke WK
    land_right_subtype      VARCHAR(40),
    item_name               VARCHAR(500),          -- perihal dokumen
    item_type               VARCHAR(40),           -- WPB_EKSPLORASI, AFE, dll
    info_item_subtype       VARCHAR(40),
    active_ind              VARCHAR(30) DEFAULT 'ORIGINAL',  -- ORIGINAL/REVISI/VALID
    effective_date          DATE,
    expiry_date             DATE,
    confidential_ind        VARCHAR(1) DEFAULT 'N',
    doc_number              VARCHAR(100),          -- No. Dokumen
    anggaran_usulan         NUMERIC(18,2),
    anggaran_disetujui      NUMERIC(18,2),
    currency_ouom           VARCHAR(10) DEFAULT 'USD',
    upload_by               VARCHAR(100),
    upload_date             TIMESTAMPTZ,
    verified_by             VARCHAR(100),
    verified_date           TIMESTAMPTZ,
    lokasi_arsip            VARCHAR(500),          -- path di Supabase Storage
    -- Vector embedding untuk AI semantic search
    embedding               vector(1536),
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    row_created_by          VARCHAR(50),
    row_created_date        TIMESTAMPTZ DEFAULT NOW(),
    row_changed_by          VARCHAR(50),
    row_changed_date        TIMESTAMPTZ DEFAULT NOW()
);

-- RM_INFO_ITEM_STATUS (menggantikan kolom CHK_* dari DBEP lama)
-- Satu baris per item checklist — jauh lebih fleksibel
CREATE TABLE IF NOT EXISTS rm_info_item_status (
    information_item_id     VARCHAR(40) REFERENCES rm_information_item(information_item_id),
    rmii_status             VARCHAR(40) REFERENCES r_rmii_status(rmii_status),
    active_ind              VARCHAR(1) DEFAULT 'N',  -- Y = checklist terpenuhi
    status_date             DATE,
    verified_by             VARCHAR(100),
    remark                  VARCHAR(500),
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    PRIMARY KEY (information_item_id, rmii_status)
);

-- LAND_RIGHT_COMPONENT (super-bridge: WK ↔ semua entitas)
CREATE TABLE IF NOT EXISTS land_right_component (
    land_right_subtype      VARCHAR(40),
    land_right_id           VARCHAR(20),
    component_obs_no        INTEGER,
    land_component_type     VARCHAR(40),
    -- Foreign keys ke berbagai entitas (nullable — hanya satu yang terisi)
    contract_id             VARCHAR(25),
    interest_set_id         VARCHAR(30),
    obligation_id           VARCHAR(30),
    information_item_id     VARCHAR(40),
    project_id              VARCHAR(30),
    work_order_id           VARCHAR(30),
    business_associate_id   VARCHAR(20),
    active_ind              VARCHAR(1) DEFAULT 'Y',
    effective_date          DATE,
    expiry_date             DATE,
    source                  VARCHAR(30) REFERENCES r_source(source),
    row_quality             VARCHAR(20) REFERENCES r_ppdm_row_quality(row_quality),
    PRIMARY KEY (land_right_subtype, land_right_id, component_obs_no)
);

-- ============================================================
-- INDEXES — untuk performa query DBEP
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_land_right_category ON land_right(land_right_category);
CREATE INDEX IF NOT EXISTS idx_land_right_type ON land_right(granted_right_type);
CREATE INDEX IF NOT EXISTS idx_rm_info_land_right ON rm_information_item(land_right_id);
CREATE INDEX IF NOT EXISTS idx_rm_info_type ON rm_information_item(item_type);
CREATE INDEX IF NOT EXISTS idx_rm_info_date ON rm_information_item(effective_date);
CREATE INDEX IF NOT EXISTS idx_rm_info_status ON rm_information_item(active_ind);
CREATE INDEX IF NOT EXISTS idx_ba_type ON business_associate(ba_type);

-- pgvector index untuk semantic search
CREATE INDEX IF NOT EXISTS idx_rm_info_embedding ON rm_information_item
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search index
ALTER TABLE rm_information_item
    ADD COLUMN IF NOT EXISTS fts_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('indonesian',
            COALESCE(item_name, '') || ' ' ||
            COALESCE(item_type, '') || ' ' ||
            COALESCE(doc_number, '')
        )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_rm_info_fts ON rm_information_item USING gin(fts_vector);

-- ============================================================
-- RPC FUNCTIONS untuk search
-- ============================================================

CREATE OR REPLACE FUNCTION search_fts(
    query_text TEXT,
    wk_filter TEXT DEFAULT NULL,
    doc_type_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    information_item_id VARCHAR,
    land_right_id VARCHAR,
    item_name VARCHAR,
    item_type VARCHAR,
    effective_date DATE,
    active_ind VARCHAR,
    rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.information_item_id,
        r.land_right_id,
        r.item_name,
        r.item_type,
        r.effective_date,
        r.active_ind,
        ts_rank(r.fts_vector, plainto_tsquery('indonesian', query_text))::FLOAT AS rank
    FROM rm_information_item r
    WHERE
        r.fts_vector @@ plainto_tsquery('indonesian', query_text)
        AND (wk_filter IS NULL OR r.land_right_id = wk_filter)
        AND (doc_type_filter IS NULL OR r.item_type = doc_type_filter)
    ORDER BY rank DESC
    LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_semantic(
    query_text TEXT,
    query_embedding vector(1536) DEFAULT NULL,
    wk_filter TEXT DEFAULT NULL,
    doc_type_filter TEXT DEFAULT NULL,
    match_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    information_item_id VARCHAR,
    land_right_id VARCHAR,
    item_name VARCHAR,
    item_type VARCHAR,
    effective_date DATE,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF query_embedding IS NULL THEN
        RETURN;
    END IF;
    RETURN QUERY
    SELECT
        r.information_item_id,
        r.land_right_id,
        r.item_name,
        r.item_type,
        r.effective_date,
        1 - (r.embedding <=> query_embedding) AS similarity
    FROM rm_information_item r
    WHERE
        r.embedding IS NOT NULL
        AND (wk_filter IS NULL OR r.land_right_id = wk_filter)
        AND (doc_type_filter IS NULL OR r.item_type = doc_type_filter)
    ORDER BY r.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
