// ============================================================
// DBEP-Next — PPDM39 TypeScript Types
// ============================================================

export interface WilayahKerja {
  land_right_id: string;
  land_right_subtype: string;
  land_right_category: "WK_ACTIVE" | "WK_TERMINATED" | "WK_RELINQUISHED" | "WK_UNITIZED" | "WK_CANDIDATE";
  granted_right_type: "PSC" | "TAC" | "JOB" | "KKS" | "GROSS_SPLIT";
  land_property_type?: string;
  acqtn_date?: string;
  effective_date?: string;
  expiry_date?: string;
  gross_size?: number;
  gross_size_ouom?: string;
  jurisdiction?: string;
  source: string;
  row_quality: string;
  // Joined fields
  nama_wk?: string;
  operator?: string;
  jumlah_dokumen?: number;
}

export interface KKKS {
  business_associate_id: string;
  ba_type: string;
  ba_category?: string;
  ba_long_name: string;
  ba_short_name?: string;
  active_ind: string;
  source: string;
  row_quality: string;
}

export type DocType =
  | "WPB_EKSPLORASI"
  | "WPB_EKSPLOITASI"
  | "AFE"
  | "POD"
  | "POP"
  | "CADANGAN"
  | "PROSPECT_LEADS"
  | "KOMITMEN"
  | "JIAN";

export type DocStatus = "ORIGINAL" | "REVISI" | "VALID";

export interface Dokumen {
  information_item_id: string;
  land_right_id: string;
  item_name: string;
  item_type: DocType;
  active_ind: DocStatus;
  effective_date?: string;
  expiry_date?: string;
  doc_number?: string;
  anggaran_usulan?: number;
  anggaran_disetujui?: number;
  currency_ouom?: string;
  upload_by?: string;
  upload_date?: string;
  verified_by?: string;
  verified_date?: string;
  lokasi_arsip?: string;
  source: string;
  row_quality: string;
  // Joined
  nama_wk?: string;
  kkks_nama?: string;
  checklist?: Record<string, boolean>;
}

export interface DashboardStats {
  total_dokumen: number;
  wk_aktif: number;
  wk_terminasi: number;
  belum_lengkap: number;
  tahun_terkini: number;
  per_tipe: Record<DocType, number>;
}

export interface SearchResult {
  information_item_id: string;
  land_right_id: string;
  item_name: string;
  item_type: DocType;
  effective_date?: string;
  active_ind: DocStatus;
  rank?: number;
  similarity?: number;
}

export interface ApiResponse<T> {
  data: T;
  count?: number;
  error?: string;
}
