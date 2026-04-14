"use client";
import { useEffect, useState, useCallback } from "react";
import { dokumenApi, wkApi, kkksApi } from "@/lib/api";
import { Dokumen, WilayahKerja, KKKS, DocType, DocStatus } from "@/types/ppdm";
import {
  cn, formatCurrency, formatDate, getTahun,
  DOC_TYPE_LABEL, STATUS_COLOR,
} from "@/lib/utils";

// ---------- Status Badge ----------
function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={cn(
      "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border",
      STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600"
    )}>
      {status}
    </span>
  );
}

// ---------- Checklist ----------
const CHECKLIST_LABELS: Record<string, string> = {
  PROPOSAL: "Proposal", PRESENTASI: "Presentasi", BS17: "BS-17",
  RT12: "RT-12", FORM_AE: "Form AE", RAPAT: "Rapat",
  SURAT_KKKS: "Surat KKKS", CHECKLIST: "Checklist",
  MOM: "MOM", DAFTAR_HADIR: "Daftar Hadir",
  BS_APPROVAL: "BS Approval", DRAFT_STJ: "Draft STJ",
  STJ_FINAL: "STJ Final", NOTA_DINAS: "Nota Dinas",
  EMAIL_KKKS: "Email KKKS", BS26: "BS-26",
};

function Checklist({ checklist }: { checklist?: Record<string, boolean> }) {
  if (!checklist) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
        const checked = checklist[key] === true;
        return (
          <span
            key={key}
            className={cn(
              "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border",
              checked
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-gray-50 text-gray-500 border-gray-200"
            )}
          >
            <span className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              checked ? "bg-green-600" : "bg-gray-300"
            )} />
            {label}
          </span>
        );
      })}
    </div>
  );
}

// ---------- Doc Detail Panel ----------
function DocDetail({ doc, onClose }: { doc: Dokumen | null; onClose: () => void }) {
  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white border-l border-gray-200">
        <p className="text-[12px] text-gray-400">Pilih dokumen untuk melihat detail</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between">
        <div>
          <div className="text-[15px] font-medium text-gray-900">{doc.land_right_id}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {DOC_TYPE_LABEL[doc.item_type]} · {getTahun(doc.effective_date)}
          </div>
        </div>
        <StatusBadge status={doc.active_ind} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-0 divide-y divide-gray-50">
          {[
            ["KKKS", doc.kkks_nama ?? "—"],
            ["Tipe Dokumen", DOC_TYPE_LABEL[doc.item_type]],
            ["Perihal", doc.item_name],
            ["Tahun", getTahun(doc.effective_date)],
            ["No. Dokumen", doc.doc_number ?? "—"],
            ["Anggaran Usulan", formatCurrency(doc.anggaran_usulan)],
            ["Anggaran Disetujui", formatCurrency(doc.anggaran_disetujui)],
            ["Diunggah oleh", doc.upload_by ?? "—"],
            ["Tanggal Unggah", formatDate(doc.upload_date)],
            ["Diverifikasi oleh", doc.verified_by ?? "—"],
            ["Lokasi Arsip", doc.lokasi_arsip ?? "—"],
          ].map(([key, val]) => (
            <div key={key} className="flex py-1.5">
              <span className="text-[11px] text-gray-400 w-36 flex-shrink-0">{key}</span>
              <span className="text-[11px] text-gray-900 font-medium flex-1 break-all">{val}</span>
            </div>
          ))}
        </div>

        {/* Checklist */}
        <div className="mt-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Status Kelengkapan
          </div>
          <Checklist checklist={doc.checklist} />
        </div>

        {/* PPDM39 reference */}
        <div className="mt-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            PPDM39 Reference
          </div>
          <div className="space-y-0 divide-y divide-gray-50">
            {[
              ["LAND_RIGHT_ID", doc.land_right_id],
              ["INFO_ITEM_ID", doc.information_item_id],
              ["ROW_QUALITY", doc.row_quality],
            ].map(([k, v]) => (
              <div key={k} className="flex py-1">
                <span className="text-[10px] text-gray-400 w-36 flex-shrink-0 font-mono">{k}</span>
                <span className="text-[10px] text-blue-600 font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <button className="flex-1 py-1.5 text-[12px] border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          Lihat PDF
        </button>
        <button className="flex-1 py-1.5 text-[12px] border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          Unduh
        </button>
        <button className="flex-1 py-1.5 text-[12px] bg-[#185fa5] text-white rounded-lg hover:bg-[#0c447c] transition-colors">
          Edit Metadata
        </button>
      </div>
    </div>
  );
}

// ---------- Main Page ----------
export default function WpbEksplorasi() {
  const [dokumen, setDokumen] = useState<Dokumen[]>([]);
  const [selected, setSelected] = useState<Dokumen | null>(null);
  const [wkList, setWkList] = useState<WilayahKerja[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterWk, setFilterWk] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    dokumenApi
      .list({
        doc_type: "WPB_EKSPLORASI",
        wk_id: filterWk || undefined,
        tahun: filterTahun ? Number(filterTahun) : undefined,
        status: filterStatus || undefined,
        limit: 100,
      })
      .then(setDokumen)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterWk, filterTahun, filterStatus]);

  useEffect(() => {
    load();
    wkApi.list({ status: "WK_ACTIVE", limit: 200 }).then(setWkList).catch(console.error);
  }, [load]);

  const filtered = search
    ? dokumen.filter((d) =>
        d.item_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.land_right_id?.toLowerCase().includes(search.toLowerCase()) ||
        d.kkks_nama?.toLowerCase().includes(search.toLowerCase())
      )
    : dokumen;

  const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <h1 className="text-[14px] font-medium text-gray-900">WP&amp;B Eksplorasi</h1>
          <span className="bg-green-50 text-green-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {filtered.length.toLocaleString("id-ID")} dokumen
          </span>
        </div>
        <input
          type="text"
          placeholder="Cari WK, KKKS, perihal…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 px-3 py-1.5 text-[12px] border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-blue-400"
        />
        <button className="px-3 py-1.5 text-[12px] bg-[#185fa5] text-white rounded-lg hover:bg-[#0c447c] transition-colors">
          + Tambah Dokumen
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <span className="text-[11px] text-gray-400">Wilayah Kerja</span>
        <select
          value={filterWk}
          onChange={(e) => setFilterWk(e.target.value)}
          className="text-[12px] px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="">Semua WK</option>
          {wkList.map((w) => (
            <option key={w.land_right_id} value={w.land_right_id}>
              {w.land_right_id}
            </option>
          ))}
        </select>

        <span className="text-[11px] text-gray-400">Tahun</span>
        <select
          value={filterTahun}
          onChange={(e) => setFilterTahun(e.target.value)}
          className="text-[12px] px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="">Semua Tahun</option>
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>

        <span className="text-[11px] text-gray-400">Status</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-[12px] px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="">Semua Status</option>
          <option>ORIGINAL</option>
          <option>REVISI</option>
          <option>VALID</option>
        </select>

        <span className="ml-auto text-[11px] text-gray-400">
          {loading ? "Memuat…" : `${filtered.length} dari ${dokumen.length} dokumen`}
        </span>
      </div>

      {/* Stats row */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex gap-3 flex-shrink-0">
        {[
          { label: "Total", value: filtered.length, color: "text-gray-900" },
          { label: "Original", value: filtered.filter((d) => d.active_ind === "ORIGINAL").length, color: "text-blue-700" },
          { label: "Revisi", value: filtered.filter((d) => d.active_ind === "REVISI").length, color: "text-amber-700" },
          { label: "Valid", value: filtered.filter((d) => d.active_ind === "VALID").length, color: "text-green-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-4 py-1.5 text-center flex-1">
            <div className={`text-[16px] font-medium ${s.color}`}>{s.value.toLocaleString("id-ID")}</div>
            <div className="text-[10px] text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Content split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Doc list */}
        <div className="w-[55%] flex flex-col overflow-hidden border-r border-gray-200 bg-white">
          {/* Header */}
          <div className="grid grid-cols-[2fr_2fr_1fr_90px] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">
            <div>Wilayah Kerja / KKKS</div>
            <div>Perihal</div>
            <div className="text-center">Tahun</div>
            <div className="text-center">Status</div>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-[12px] text-gray-400">
                Memuat data…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-[12px] text-gray-400">
                Tidak ada dokumen ditemukan
              </div>
            ) : (
              filtered.map((doc) => (
                <div
                  key={doc.information_item_id}
                  onClick={() => setSelected(doc)}
                  className={cn(
                    "grid grid-cols-[2fr_2fr_1fr_90px] gap-2 px-3 py-2 border-b border-gray-100 cursor-pointer transition-colors items-center",
                    selected?.information_item_id === doc.information_item_id
                      ? "bg-blue-50 border-l-2 border-l-[#185fa5]"
                      : "hover:bg-blue-50/50"
                  )}
                >
                  <div>
                    <div className="text-[12px] font-medium text-gray-900">{doc.land_right_id}</div>
                    <div className="text-[10px] text-gray-400 truncate">{doc.kkks_nama ?? "—"}</div>
                  </div>
                  <div className="text-[11px] text-gray-600 truncate">{doc.item_name}</div>
                  <div className="text-[11px] text-gray-400 text-center">{getTahun(doc.effective_date)}</div>
                  <div className="text-center">
                    <StatusBadge status={doc.active_ind} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Doc detail */}
        <DocDetail doc={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
