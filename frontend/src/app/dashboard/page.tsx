"use client";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ───────────────────────────────────────────────────────────
// DBEP-Next — Dashboard
// Fetch via Next.js API proxy → FastAPI localhost:8000 → Supabase
// Endpoint: GET /api/proxy/dashboard/stats
// ───────────────────────────────────────────────────────────

const API = "/api/proxy";

const QUICK = [
  {
    label: "WP&B Eksplorasi",
    href: "/dokumen/wpb-eksplorasi",
    desc: "Rencana Kerja & Anggaran",
    color: "#1565c0",
  },
  {
    label: "AFE",
    href: "/dokumen/afe",
    desc: "Authorization For Expenditure",
    color: "#6a1b9a",
  },
  {
    label: "POD / POP",
    href: "/dokumen/pod",
    desc: "Plan of Development",
    color: "#bf360c",
  },
  {
    label: "Cadangan Migas",
    href: "/dokumen/cadangan",
    desc: "Laporan Cadangan Tahunan",
    color: "#1a237e",
  },
  {
    label: "Prospect & Leads",
    href: "/dokumen/resources",
    desc: "Laporan Prospek Tahunan",
    color: "#004d40",
  },
  {
    label: "Pencarian AI",
    href: "/search",
    desc: "Cari dengan bahasa natural",
    color: "#388e3c",
  },
];

type Kpi = {
  wk_aktif?: number;
  wk_terminasi?: number;
  wk_total?: number;
  kkks_total?: number;
  dokumen_total?: number;
  cadangan_entri?: number;
  resources_total?: number;
  prospect_total?: number;
  lead_total?: number;
  wk_producing?: number;
  wk_not_producing?: number;
};
type Stats = {
  kpi: Kpi;
  wk_status: { status: string; jumlah: number }[];
  kategori: { kategori: string; jumlah: number }[];
  cadangan: {
    fluida: string;
    total_1p: number;
    total_2p: number;
    total_3p: number;
    total_potensial: number;
    jumlah_entri: number;
  }[];
  resources: { jenis: string; jumlah: number }[];
  top_wk: { wkid: string; nama_wk: string; jumlah_dokumen: number }[];
};

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : Number(n).toLocaleString("id-ID");

const fmtBig = (n: number | null | undefined, d = 1) => {
  if (n == null) return "—";
  const v = Number(n);
  if (v >= 1e9) return (v / 1e9).toFixed(d) + " M";
  if (v >= 1e6) return (v / 1e6).toFixed(d) + " Jt";
  if (v >= 1e3) return (v / 1e3).toFixed(d) + " rb";
  return v.toFixed(d);
};

const TIP_STYLE = {
  background: "#1a1a1a",
  border: "1px solid #3a3a3a",
  borderRadius: 6,
  fontSize: 12,
  color: "#e0e0e0",
};
const AXIS_TICK = { fontSize: 11, fill: "#9e9e9e" };
const AXIS_LINE = { stroke: "#3a3a3a" };
const LEGEND_STYLE = { fontSize: 12, color: "#bdbdbd" };

// ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/dashboard/stats`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.text();
          throw new Error(`HTTP ${r.status} — ${body.slice(0, 200)}`);
        }
        return r.json();
      })
      .then((d) => setData(d as Stats))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const kpi = data?.kpi ?? {};

  const cards = [
    {
      label: "Total WK",
      value: kpi.wk_total,
      color: "#e0e0e0",
      sub: "Seluruh Wilayah Kerja",
    },
    {
      label: "WK Aktif",
      value: kpi.wk_aktif,
      color: "#66bb6a",
      sub: `${fmt(kpi.wk_producing)} WK Produksi, ${fmt(kpi.wk_not_producing)} WK Belum Produksi`,
    },
    {
      label: "WK Terminasi",
      value: kpi.wk_terminasi,
      color: "#9e9e9e",
      sub: "Kontrak berakhir",
    },
    {
      label: "Total Dokumen",
      value: kpi.dokumen_total,
      color: "#42a5f5",
      sub: "WPB + AFE + POD + dll",
    },
  ];

  const miniCards = [
    { label: "Kontraktor (KKKS)", value: kpi.kkks_total, color: "#ba68c8" },
    { label: "Entri Cadangan", value: kpi.cadangan_entri, color: "#ff8a65" },
    { label: "Prospect", value: kpi.prospect_total, color: "#64b5f6" },
    { label: "Lead", value: kpi.lead_total, color: "#ffb74d" },
  ];

  const wkColors: Record<string, string> = {
    Aktif: "#66bb6a",
    Terminasi: "#757575",
    Lainnya: "#546e7a",
  };
  const resColors: Record<string, string> = {
    Prospect: "#42a5f5",
    Lead: "#ff9800",
  };

  const wkDonut = (data?.wk_status ?? []).map((r) => ({
    name: r.status,
    value: r.jumlah,
  }));
  const resDonut = (data?.resources ?? []).map((r) => ({
    name:
      r.jenis === "PROSPECT"
        ? "Prospect"
        : r.jenis === "LEAD"
          ? "Lead"
          : r.jenis,
    value: r.jumlah,
  }));

  const oil = (data?.cadangan ?? []).find((r) => r.fluida === "OIL");
  const gas = (data?.cadangan ?? []).find((r) => r.fluida === "GAS");
  const cadBars = [
    { kelas: "1P", Oil: +(oil?.total_1p ?? 0), Gas: +(gas?.total_1p ?? 0) },
    { kelas: "2P", Oil: +(oil?.total_2p ?? 0), Gas: +(gas?.total_2p ?? 0) },
    { kelas: "3P", Oil: +(oil?.total_3p ?? 0), Gas: +(gas?.total_3p ?? 0) },
  ];
  const cadEmpty = cadBars.every((b) => b.Oil === 0 && b.Gas === 0);

  // ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#212121",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "#212121",
          borderBottom: "1px solid #383838",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{ fontSize: 20, fontWeight: 500, color: "#f0f0f0", flex: 1 }}
        >
          Dashboard
        </div>
        <div style={{ fontSize: 11, color: "#666" }}>
          DBEP-Next · SKK Migas · Spektrum IOG 4.0
        </div>
      </div>

      <div
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {err && (
          <div
            style={{
              background: "#3a1a1a",
              border: "1px solid #5a2a2a",
              color: "#ef9a9a",
              padding: "10px 14px",
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Gagal memuat statistik:{" "}
            <span style={{ fontFamily: "monospace" }}>{err}</span>
            <div style={{ color: "#b36b6b", marginTop: 4, fontSize: 11 }}>
              Pastikan FastAPI berjalan (
              <code>
                uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
              </code>
              ) dan view <code>v_stats_*</code> sudah dibuat di Supabase.
            </div>
          </div>
        )}

        {/* 4 KPI Utama */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 12,
          }}
        >
          {cards.map((s) => (
            <div
              key={s.label}
              style={{
                background: "#2c2c2c",
                border: "1px solid #3a3a3a",
                borderRadius: 8,
                padding: "16px 18px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  color: s.color,
                  letterSpacing: -1,
                }}
              >
                {loading ? "..." : fmt(s.value)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#bdbdbd",
                  marginTop: 4,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* 4 Mini KPI */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
          }}
        >
          {miniCards.map((s) => (
            <div
              key={s.label}
              style={{
                background: "#2c2c2c",
                border: "1px solid #3a3a3a",
                borderRadius: 6,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 32,
                  background: s.color,
                  borderRadius: 2,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#9e9e9e",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{ fontSize: 18, fontWeight: 500, color: "#f0f0f0" }}
                >
                  {loading ? "..." : fmt(s.value)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 3 Chart Panels — WK Donut · Prospect/Lead Donut · Cadangan Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <ChartPanel title="Status Wilayah Kerja" sub="Aktif vs Terminasi">
            {wkDonut.length === 0 ? (
              <Empty loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={wkDonut}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    stroke="#2c2c2c"
                    label={(e: any) => `${e.name}: ${e.value}`}
                  >
                    {wkDonut.map((d, i) => (
                      <Cell key={i} fill={wkColors[d.name] ?? "#546e7a"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TIP_STYLE}
                    formatter={(v: number) => fmt(v)}
                  />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

          <ChartPanel title="Prospect vs Lead" sub="Sumber daya eksplorasi">
            {resDonut.length === 0 ? (
              <Empty loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={resDonut}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    stroke="#2c2c2c"
                    label={(e: any) => `${e.name}: ${fmt(e.value)}`}
                  >
                    {resDonut.map((d, i) => (
                      <Cell key={i} fill={resColors[d.name] ?? "#546e7a"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TIP_STYLE}
                    formatter={(v: number) => fmt(v)}
                  />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

          <ChartPanel title="Cadangan 1P / 2P / 3P" sub="Agregat Oil & Gas">
            {cadEmpty ? (
              <Empty loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={cadBars}
                  margin={{ top: 10, right: 5, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#3a3a3a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="kelas"
                    tick={AXIS_TICK}
                    axisLine={AXIS_LINE}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={AXIS_LINE}
                    tickFormatter={(v) => fmtBig(v, 0)}
                  />
                  <Tooltip
                    contentStyle={TIP_STYLE}
                    formatter={(v: number) => fmtBig(v, 2)}
                  />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="Oil" fill="#4caf50" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Gas" fill="#ff9800" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </div>

        {/* Dokumen per Kategori (wide) + Top 10 WK (narrow) */}
        <div
          style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12 }}
        >
          <ChartPanel
            title="Dokumen per Kategori"
            sub="Seluruh dokumen di RM_INFORMATION_ITEM"
          >
            {(data?.kategori ?? []).length === 0 ? (
              <Empty loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data?.kategori ?? []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#3a3a3a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="kategori"
                    tick={AXIS_TICK}
                    axisLine={AXIS_LINE}
                    interval={0}
                    angle={-10}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={AXIS_LINE}
                    tickFormatter={(v) => fmtBig(v, 0)}
                  />
                  <Tooltip
                    contentStyle={TIP_STYLE}
                    formatter={(v: number) => fmt(v)}
                  />
                  <Bar dataKey="jumlah" fill="#42a5f5" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

          <ChartPanel
            title="Top 10 WK — Dokumen Terbanyak"
            sub="Klik untuk buka detail WK"
          >
            {(data?.top_wk ?? []).length === 0 ? (
              <Empty loading={loading} />
            ) : (
              <TopWkList rows={data!.top_wk} />
            )}
          </ChartPanel>
        </div>

        {/* Akses Cepat — preserve existing */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#757575",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Akses Cepat
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 10,
            }}
          >
            {QUICK.map((q) => (
              <a
                key={q.href}
                href={q.href}
                style={{
                  background: "#2c2c2c",
                  border: "1px solid #3a3a3a",
                  borderLeft: `3px solid ${q.color}`,
                  borderRadius: 6,
                  padding: "12px 14px",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                <div
                  style={{ fontSize: 13, fontWeight: 500, color: "#e0e0e0" }}
                >
                  {q.label}
                </div>
                <div style={{ fontSize: 11, color: "#757575", marginTop: 3 }}>
                  {q.desc}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Unggah Dokumen — preserve existing */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#757575",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Unggah Dokumen
          </div>
          <div
            style={{
              background: "#2c2c2c",
              border: "2px dashed #3a3a3a",
              borderRadius: 6,
              padding: 36,
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, color: "#757575" }}>
              Seret &amp; lepas file PDF di sini, atau{" "}
              <span style={{ color: "#66bb6a", fontWeight: 500 }}>
                pilih file
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#4a4a4a", marginTop: 5 }}>
              PDF, TIFF, JPG — maks 50 MB per file
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────

function ChartPanel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#2c2c2c",
        border: "1px solid #3a3a3a",
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "#e0e0e0",
          marginBottom: 2,
        }}
      >
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#757575", marginBottom: 8 }}>
          {sub}
        </div>
      )}
      {children}
    </div>
  );
}

function Empty({ loading }: { loading: boolean }) {
  return (
    <div
      style={{
        height: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#555",
        fontSize: 12,
      }}
    >
      {loading ? "Memuat..." : "Tidak ada data"}
    </div>
  );
}

function TopWkList({
  rows,
}: {
  rows: { wkid: string; nama_wk: string; jumlah_dokumen: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.jumlah_dokumen), 1);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxHeight: 280,
        overflowY: "auto",
        paddingRight: 4,
      }}
    >
      {rows.map((r, i) => {
        const pct = (r.jumlah_dokumen / max) * 100;
        const href = r.wkid
          ? `/wk/${r.wkid}`
          : `/wk?q=${encodeURIComponent(r.nama_wk)}`;
        return (
          <a
            key={`${r.wkid}-${i}`}
            href={href}
            style={{ textDecoration: "none", display: "block" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                marginBottom: 3,
              }}
            >
              <span
                style={{
                  color: "#bdbdbd",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginRight: 8,
                }}
              >
                <span
                  style={{
                    color: "#555",
                    marginRight: 6,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {r.nama_wk}
              </span>
              <span
                style={{
                  color: "#bdbdbd",
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}
              >
                {fmt(r.jumlah_dokumen)}
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "#1a1a1a",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "#42a5f5",
                }}
              />
            </div>
          </a>
        );
      })}
    </div>
  );
}
