"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ────────────────────────────────────────────────
interface WK {
  wkid: string;
  nama_wk: string;
  tipe_kontrak: string;
  aktif: string;
  status_wk: string;
  lokasi: string;
  fase: string;
  tgl_efektif: string | null;
  tgl_berakhir: string | null;
  luas_km2: number | null;
  operator_utama: string | null;
  semua_operator_aktif: string | null;
  jumlah_operator: number;
}

// ── Konstanta ────────────────────────────────────────────
const TIPE_LIST   = ["PSC", "PTM", "PSC-EXT", "JOB", "JOA", "COW", "KONTRAK JASA"];
const LOKASI_LIST = ["ONSHORE", "OFFSHORE", "ONSHORE/OFFSHORE"];

// ── Sub-komponen ─────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE:     { bg: "#1b5e2033", color: "#66bb6a", label: "Aktif" },
    TERMINATED: { bg: "#37373733", color: "#757575", label: "Terminasi" },
    TERMINATING:{ bg: "#e65100" + "22", color: "#ff8a65", label: "Terminasi..." },
  };
  const c = cfg[status] ?? { bg: "#2a2a2a", color: "#9e9e9e", label: status };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 3,
      background: c.bg, color: c.color, border: `1px solid ${c.color}55`,
      whiteSpace: "nowrap",
    }}>{c.label}</span>
  );
}

function TipeBadge({ tipe }: { tipe: string }) {
  const colors: Record<string, string> = {
    PSC: "#1565c0", "PSC-EXT": "#0277bd", PTM: "#6a1b9a",
    JOB: "#bf360c", JOA: "#e65100", COW: "#1a237e",
  };
  const color = colors[tipe] ?? "#37474f";
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
      background: color + "33", color, border: `1px solid ${color}66`,
    }}>{tipe || "—"}</span>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{
      background: active ? "#1b5e20" : "#2a2a2a",
      border: `1px solid ${active ? "#2e7d32" : "#383838"}`,
      color: active ? "#a5d6a7" : "#9e9e9e",
      borderRadius: 4, padding: "3px 9px", fontSize: 11,
      cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ── Halaman Utama ─────────────────────────────────────────
export default function WKPage() {
  const [rows, setRows]     = useState<WK[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy]   = useState<string>("wkid");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [search, setSearch] = useState("");
  const [filterAktif, setFilterAktif]   = useState<"" | "Y" | "N">("");
  const [filterTipe, setFilterTipe]     = useState("");
  const [filterLokasi, setFilterLokasi] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = sb
      .from("v_wk_lengkap")
      .select("*", { count: "exact" })
      .order("wkid", { ascending: true });

    if (filterAktif)  q = q.eq("aktif", filterAktif);
    if (filterTipe)   q = q.eq("tipe_kontrak", filterTipe);
    if (filterLokasi) q = q.eq("lokasi", filterLokasi);
    if (search)       q = q.or(`wkid.ilike.%${search}%,nama_wk.ilike.%${search}%,operator_utama.ilike.%${search}%`);

    const { data, count, error } = await q;
    if (!error) {
      setRows(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [filterAktif, filterTipe, filterLokasi, search]);

  useEffect(() => { load(); }, [load]);


  const fmtDate = (s: string | null) => s ? s.slice(0, 7) : "—"; // YYYY-MM
  const fmtSize = (n: number | null) =>
    n ? n.toLocaleString("id-ID") + " km²" : "—";


  function handleSort(col: string) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  const sortedRows = [...rows].sort((a, b) => {
    const va = (a as any)[sortBy] ?? "";
    const vb = (b as any)[sortBy] ?? "";
    const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#212121", overflow: "hidden" }}>

      {/* ── Topbar ── */}
      <div style={{ background: "#212121", borderBottom: "1px solid #333", padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 18, fontWeight: 400, color: "#e0e0e0" }}>Wilayah Kerja</span>
          <span style={{ fontSize: 11, color: "#555", marginLeft: 10 }}>
            {total.toLocaleString("id-ID")} WK
          </span>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari WKID, nama WK, KKKS..."
          style={{
            width: 240, background: "#2a2a2a", border: "1px solid #383838",
            borderRadius: 4, padding: "5px 11px", fontSize: 12,
            color: "#e0e0e0", outline: "none",
          }}
        />
        <Link href="/wk/baru" style={{
          padding: "5px 14px", borderRadius: 4, fontSize: 12,
          background: "#1b5e20", border: "1px solid #2e7d32",
          color: "#a5d6a7", textDecoration: "none", whiteSpace: "nowrap",
        }}>+ WK Baru</Link>
      </div>

      {/* ── Filter chips ── */}
      <div style={{
        background: "#1e1e1e", borderBottom: "1px solid #2a2a2a",
        padding: "7px 20px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ fontSize: 10, color: "#555", marginRight: 2 }}>Status:</span>

        <span style={{ color: "#2a2a2a", margin: "0 6px" }}>|</span>
        <span style={{ fontSize: 10, color: "#555", marginRight: 2 }}>Tipe:</span>
        {TIPE_LIST.map(t => (
          <Chip key={t} label={t} active={filterTipe === t} onClick={() => { setFilterTipe(filterTipe === t ? "" : t); }} />
        ))}

        <span style={{ color: "#2a2a2a", margin: "0 6px" }}>|</span>
        <span style={{ fontSize: 10, color: "#555", marginRight: 2 }}>Lokasi:</span>
        {LOKASI_LIST.map(l => (
          <Chip key={l} label={l} active={filterLokasi === l} onClick={() => { setFilterLokasi(filterLokasi === l ? "" : l); }} />
        ))}

        <span style={{ marginLeft: "auto", fontSize: 11, color: "#555" }}>
          {loading ? "Memuat..." : `${rows.length} dari ${total.toLocaleString("id-ID")}`}
        </span>
      </div>

      {/* ── Tabel ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <tr style={{ background: "#1a1a1a", borderBottom: "1px solid #333" }}>
              {([
                ["WKID",               "90px",  "wkid"],
                ["Nama Wilayah Kerja", "auto",  "nama_wk"],
                ["Tipe",               "80px",  "tipe_kontrak"],
                ["Status",             "90px",  "status_wk"],
                ["Lokasi",             "120px", "lokasi"],
                ["Fase",               "130px", "fase"],
                ["KKKS Operator Aktif","220px", "operator_utama"],
                ["Efektif",            "80px",  "tgl_efektif"],
                ["Berakhir",           "80px",  "tgl_berakhir"],
                ["Luas",               "90px",  "luas_km2"],
              ] as [string,string,string][]).map(([h, w, col]) => (
                <th key={h} onClick={() => handleSort(col)} style={{
                  padding: "8px 10px", textAlign: "left", fontWeight: 600,
                  fontSize: 10, color: sortBy === col ? "#66bb6a" : "#666",
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  width: w, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
                }}>
                  {h}{sortBy === col ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "#555" }}>Memuat data...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "#555" }}>Tidak ada data</td></tr>
            ) : sortedRows.map((wk, i) => (
              <tr key={wk.wkid} style={{
                background: i % 2 === 0 ? "#222" : "#212121",
                borderBottom: "1px solid #2a2a2a",
                transition: "background 0.1s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "#2a2a2a")}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#222" : "#212121")}
              >
                {/* WKID */}
                <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                  <Link href={`/wk/${wk.wkid}`} style={{ color: "#66bb6a", fontWeight: 600, textDecoration: "none", fontFamily: "monospace", fontSize: 12 }}>
                    {wk.wkid}
                  </Link>
                </td>
                {/* Nama WK */}
                <td style={{ padding: "7px 10px", color: "#e0e0e0", maxWidth: 280 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={wk.nama_wk}>{wk.nama_wk}</div>
                </td>
                {/* Tipe */}
                <td style={{ padding: "7px 10px" }}><TipeBadge tipe={wk.tipe_kontrak} /></td>
                {/* Status */}
                <td style={{ padding: "7px 10px" }}><StatusBadge status={wk.status_wk} /></td>
                {/* Lokasi */}
                <td style={{ padding: "7px 10px", color: "#9e9e9e", fontSize: 11 }}>{wk.lokasi || "—"}</td>
                {/* Fase */}
                <td style={{ padding: "7px 10px", color: "#9e9e9e", fontSize: 11 }}>
                  <span style={{ whiteSpace: "nowrap" }}>{wk.fase || "—"}</span>
                </td>
                {/* Operator */}
                <td style={{ padding: "7px 10px", color: "#bdbdbd", fontSize: 11, maxWidth: 220 }}>
                  {wk.operator_utama ? (
                    <div title={wk.semua_operator_aktif ?? wk.operator_utama}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {wk.operator_utama}
                      </div>
                      {(wk.jumlah_operator ?? 0) > 1 && (
                        <span style={{ fontSize: 9, color: "#555" }}>+{(wk.jumlah_operator ?? 0) - 1} lainnya</span>
                      )}
                    </div>
                  ) : <span style={{ color: "#444" }}>—</span>}
                </td>
                {/* Efektif */}
                <td style={{ padding: "7px 10px", color: "#757575", fontSize: 11, whiteSpace: "nowrap" }}>
                  {fmtDate(wk.tgl_efektif)}
                </td>
                {/* Berakhir */}
                <td style={{ padding: "7px 10px", fontSize: 11, whiteSpace: "nowrap" }}>
                  <span style={{ color: wk.aktif === "Y" ? "#ef9a9a" : "#555" }}>
                    {fmtDate(wk.tgl_berakhir)}
                  </span>
                </td>
                {/* Luas */}
                <td style={{ padding: "7px 10px", color: "#757575", fontSize: 11, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {fmtSize(wk.luas_km2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}
