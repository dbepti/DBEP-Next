-- ============================================================
-- DBEP-Next — Seed 001: Foundation + Reference Data
-- Jalankan setelah 001_ppdm39_schema.sql
-- ============================================================

-- Phase 0: ROW_QUALITY harus pertama
INSERT INTO r_ppdm_row_quality (row_quality, abbreviation, short_name, remark) VALUES
('GOOD',     'G', 'Good',     'Data valid dan terverifikasi'),
('MIGRATED', 'M', 'Migrated', 'Data migrasi dari DBEP Oracle'),
('SUSPECT',  'S', 'Suspect',  'Perlu verifikasi ulang'),
('BAD',      'B', 'Bad',      'Data diketahui bermasalah')
ON CONFLICT DO NOTHING;

-- Phase 0: R_SOURCE
INSERT INTO r_source (source, short_name, remark) VALUES
('SPEKTRUM_SEED', 'SPEKTRUM', 'Spektrum IOG 4.0 reference data'),
('DBEP_LEGACY',   'DBEP',     'Data migrasi dari DBEP Oracle BPMSTCAT'),
('DBEP_NEXT',     'DBEP-N',   'Data masuk via DBEP-Next application'),
('KEP13_SEED',    'KEP13',    'Kepmen ESDM No.13 reference'),
('MANUAL',        'MANUAL',   'Input manual post-migration')
ON CONFLICT DO NOTHING;

-- R_BA_TYPE — termasuk nilai Indonesia-specific (gap dari SIGMA)
INSERT INTO r_ba_type (ba_type, short_name, remark, source, row_quality) VALUES
('KKKS',           'KKKS',     'Kontraktor Kontrak Kerja Sama',         'SPEKTRUM_SEED', 'GOOD'),
('OPERATOR_WK',    'OPERATOR', 'Operator Wilayah Kerja PSC/TAC',        'SPEKTRUM_SEED', 'GOOD'),
('NON_OPERATOR',   'NON-OP',   'Non-Operator Interest Holder',          'SPEKTRUM_SEED', 'GOOD'),
('REGULATOR',      'REGUL',    'SKK Migas / Kementerian ESDM',          'SPEKTRUM_SEED', 'GOOD'),
('KONTRAKTOR',     'KONTR',    'Kontraktor jasa (non-KKKS)',             'SPEKTRUM_SEED', 'GOOD'),
('MITRA',          'MITRA',    'Mitra kerja sama non-operasional',      'SPEKTRUM_SEED', 'GOOD')
ON CONFLICT DO NOTHING;

-- R_GRANTED_RIGHT_TYPE — tipe kontrak WK
INSERT INTO r_granted_right_type (granted_right_type, short_name, remark, source, row_quality) VALUES
('PSC',           'PSC',  'Production Sharing Contract',   'SPEKTRUM_SEED', 'GOOD'),
('TAC',           'TAC',  'Technical Assistance Contract', 'SPEKTRUM_SEED', 'GOOD'),
('JOB',           'JOB',  'Joint Operating Body',          'SPEKTRUM_SEED', 'GOOD'),
('KKS',           'KKS',  'Kontrak Kerja Sama (umum)',     'SPEKTRUM_SEED', 'GOOD'),
('GROSS_SPLIT',   'GS',   'Gross Split Contract',          'SPEKTRUM_SEED', 'GOOD')
ON CONFLICT DO NOTHING;

-- R_LAND_RIGHT_CATEGORY — status WK
INSERT INTO r_land_right_category (land_right_category, short_name, remark, source, row_quality) VALUES
('WK_ACTIVE',        'ACTIVE',  'WK aktif berproduksi atau eksplorasi', 'SPEKTRUM_SEED', 'GOOD'),
('WK_TERMINATED',    'TERM',    'WK telah berakhir/terminasi',          'SPEKTRUM_SEED', 'GOOD'),
('WK_RELINQUISHED',  'RELQ',    'WK dikembalikan ke negara',            'SPEKTRUM_SEED', 'GOOD'),
('WK_UNITIZED',      'UNIT',    'WK unitisasi dengan WK lain',          'SPEKTRUM_SEED', 'GOOD'),
('WK_CANDIDATE',     'CAND',    'Calon WK baru (lelang)',               'SPEKTRUM_SEED', 'GOOD')
ON CONFLICT DO NOTHING;

-- R_OBLIGATION_CATEGORY — jenis kewajiban WP&B
INSERT INTO r_obligation_category (obligation_category, short_name, remark, source, row_quality) VALUES
('MINIMUM_WORK_PROGRAM', 'MWP',  'Minimum Work Program commitment',   'SPEKTRUM_SEED', 'GOOD'),
('FIRM_COMMITMENT',      'FIRM', 'Firm commitment (wajib)',            'SPEKTRUM_SEED', 'GOOD'),
('CONTINGENT',           'CONT', 'Contingent commitment (opsional)',   'SPEKTRUM_SEED', 'GOOD'),
('BONUS',                'BONS', 'Bonus signature / production',       'SPEKTRUM_SEED', 'GOOD'),
('RELINQUISHMENT',       'RELQ', 'Kewajiban relinquishment area',     'SPEKTRUM_SEED', 'GOOD')
ON CONFLICT DO NOTHING;

-- R_RMII_STATUS — checklist kelengkapan dokumen (mengganti CHK_* DBEP lama)
INSERT INTO r_rmii_status (rmii_status, short_name, remark, source, row_quality) VALUES
('PROPOSAL',      'PROP',  'Dokumen proposal',                'SPEKTRUM_SEED', 'GOOD'),
('PRESENTASI',    'PRES',  'Materi presentasi',               'SPEKTRUM_SEED', 'GOOD'),
('BS17',          'BS17',  'Form BS-17',                      'SPEKTRUM_SEED', 'GOOD'),
('RT12',          'RT12',  'Form RT-12',                      'SPEKTRUM_SEED', 'GOOD'),
('FORM_AE',       'FAE',   'Form AE',                         'SPEKTRUM_SEED', 'GOOD'),
('RAPAT',         'RPT',   'Notulen rapat',                   'SPEKTRUM_SEED', 'GOOD'),
('SURAT_KKKS',    'SKKKS', 'Surat dari KKKS',                 'SPEKTRUM_SEED', 'GOOD'),
('CHECKLIST',     'CHKL',  'Checklist dokumen',               'SPEKTRUM_SEED', 'GOOD'),
('MOM',           'MOM',   'Minutes of Meeting',              'SPEKTRUM_SEED', 'GOOD'),
('DAFTAR_HADIR',  'HADIR', 'Daftar hadir rapat',              'SPEKTRUM_SEED', 'GOOD'),
('BS_APPROVAL',   'BSAPR', 'BS approval',                     'SPEKTRUM_SEED', 'GOOD'),
('DRAFT_STJ',     'DSTJ',  'Draft surat persetujuan',         'SPEKTRUM_SEED', 'GOOD'),
('STJ_FINAL',     'STJ',   'Surat persetujuan final',         'SPEKTRUM_SEED', 'GOOD'),
('EVAL_GEOLOGI',  'EGEO',  'Evaluasi geologi',                'SPEKTRUM_SEED', 'GOOD'),
('EVAL_GEOFIS',   'EGEOF', 'Evaluasi geofisika',              'SPEKTRUM_SEED', 'GOOD'),
('EVAL_RESERVOIR','ERES',  'Evaluasi reservoir',              'SPEKTRUM_SEED', 'GOOD'),
('EVAL_EKONOMI',  'EKON',  'Evaluasi ekonomi',                'SPEKTRUM_SEED', 'GOOD'),
('NOTA_DINAS',    'NOTA',  'Nota dinas',                      'SPEKTRUM_SEED', 'GOOD'),
('EMAIL_KKKS',    'EMAIL', 'Konfirmasi email KKKS',            'SPEKTRUM_SEED', 'GOOD'),
('BS26',          'BS26',  'Form BS-26',                      'SPEKTRUM_SEED', 'GOOD')
ON CONFLICT DO NOTHING;

-- SKK Migas sebagai REGULATOR Business Associate
INSERT INTO business_associate (
    business_associate_id, ba_type, ba_category, ba_long_name, ba_short_name,
    source, row_quality, row_created_by
) VALUES (
    'SKK-MIGAS', 'REGULATOR', 'UPSTREAM_OIL_GAS',
    'SKK Migas — Satuan Kerja Khusus Pelaksana Kegiatan Usaha Hulu Minyak dan Gas Bumi',
    'SKK Migas', 'SPEKTRUM_SEED', 'GOOD', 'SPEKTRUM_SEED'
) ON CONFLICT DO NOTHING;
