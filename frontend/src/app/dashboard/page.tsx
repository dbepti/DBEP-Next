"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const QUICK = [
  { label: "WP&B Eksplorasi", href: "/dokumen/wpb-eksplorasi", desc: "Rencana Kerja & Anggaran", color: "#1565c0" },
  { label: "AFE", href: "/dokumen/afe", desc: "Authorization For Expenditure", color: "#6a1b9a" },
  { label: "POD / POP", href: "/dokumen/pod", desc: "Plan of Development", color: "#bf360c" },
  { label: "Cadangan Migas", href: "/dokumen/cadangan", desc: "Laporan Cadangan Tahunan", color: "#1a237e" },
  { label: "Prospect & Leads", href: "/dokumen/prospect-leads", desc: "Laporan Prospek Tahunan", color: "#004d40" },
  { label: "Pencarian AI", href: "/search", desc: "Cari dengan bahasa natural", color: "#388e3c" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState({ aktif: 0, terminasi: 0, totalWk: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [total, aktif, terminasi] = await Promise.all([
          supabase.from("land_right").select("*", { count: "exact", head: true }),
          supabase.from("land_right").select("*", { count: "exact", head: true }).eq("land_right_category", "WK_ACTIVE"),
          supabase.from("land_right").select("*", { count: "exact", head: true }).eq("land_right_category", "WK_TERMINATED"),
        ]);
        setStats({ totalWk: total.count ?? 0, aktif: aktif.count ?? 0, terminasi: terminasi.count ?? 0 });
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const cards = [
    { label: "Total WK", value: stats.totalWk, color: "#e0e0e0", sub: "Seluruh Wilayah Kerja" },
    { label: "WK Aktif", value: stats.aktif, color: "#66bb6a", sub: "Sedang berproduksi" },
    { label: "WK Terminasi", value: stats.terminasi, color: "#9e9e9e", sub: "Kontrak berakhir" },
    { label: "Total Dokumen", value: 0, color: "#42a5f5", sub: "Sprint 3 — segera" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#212121", overflowY:"auto" }}>
      {/* Topbar */}
      <div style={{ background:"#212121", borderBottom:"1px solid #383838", padding:"12px 20px", display:"flex", alignItems:"center" }}>
        <div style={{ fontSize:20, fontWeight:500, color:"#f0f0f0", flex:1 }}>Dashboard</div>
        <div style={{ fontSize:11, color:"#666" }}>DBEP-Next · SKK Migas · Spektrum IOG 4.0</div>
      </div>

      <div style={{ padding:20, display:"flex", flexDirection:"column", gap:16 }}>

        {/* Stat Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {cards.map(s => (
            <div key={s.label} style={{ background:"#2c2c2c", border:"1px solid #3a3a3a", borderRadius:8, padding:"16px 18px", textAlign:"center" }}>
              <div style={{ fontSize:32, fontWeight:500, color:s.color, letterSpacing:-1 }}>
                {loading ? "..." : s.value.toLocaleString("id-ID")}
              </div>
              <div style={{ fontSize:13, fontWeight:500, color:"#bdbdbd", marginTop:4 }}>{s.label}</div>
              <div style={{ fontSize:11, color:"#666", marginTop:2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick Access */}
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:"#757575", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.1em" }}>
            Akses Cepat
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {QUICK.map(q => (
              <a key={q.href} href={q.href} style={{ background:"#2c2c2c", border:"1px solid #3a3a3a", borderLeft:`3px solid ${q.color}`, borderRadius:6, padding:"12px 14px", textDecoration:"none", display:"block", transition:"border-color .15s" }}>
                <div style={{ fontSize:13, fontWeight:500, color:"#e0e0e0" }}>{q.label}</div>
                <div style={{ fontSize:11, color:"#757575", marginTop:3 }}>{q.desc}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:"#757575", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.1em" }}>
            Unggah Dokumen
          </div>
          <div style={{ background:"#2c2c2c", border:"2px dashed #3a3a3a", borderRadius:6, padding:36, textAlign:"center", cursor:"pointer" }}>
            <div style={{ fontSize:13, color:"#757575" }}>
              Seret &amp; lepas file PDF di sini, atau{" "}
              <span style={{ color:"#66bb6a", fontWeight:500 }}>pilih file</span>
            </div>
            <div style={{ fontSize:11, color:"#4a4a4a", marginTop:5 }}>PDF, TIFF, JPG — maks 50 MB per file</div>
          </div>
        </div>

      </div>
    </div>
  );
}
