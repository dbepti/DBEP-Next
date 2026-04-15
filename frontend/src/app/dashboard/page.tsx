"use client";
import { useEffect, useState } from "react";
import { wkApi, dokumenApi } from "@/lib/api";

const QUICK = [
  { label: "WP&B Eksplorasi", href: "/dokumen/wpb-eksplorasi", desc: "Rencana Kerja & Anggaran", color: "#1565c0" },
  { label: "AFE", href: "/dokumen/afe", desc: "Authorization For Expenditure", color: "#6a1b9a" },
  { label: "POD / POP", href: "/dokumen/pod", desc: "Plan of Development", color: "#bf360c" },
  { label: "Cadangan Migas", href: "/dokumen/cadangan", desc: "Laporan Cadangan Tahunan", color: "#1a237e" },
  { label: "Prospect & Leads", href: "/dokumen/prospect-leads", desc: "Laporan Prospek Tahunan", color: "#004d40" },
  { label: "Pencarian AI", href: "/search", desc: "Cari dengan bahasa natural", color: "#388e3c" },
];

export default function DashboardPage() {
  const [wkStats, setWkStats] = useState<any>(null);
  const [docStats, setDocStats] = useState<any>(null);

  useEffect(() => {
    wkApi.stats().then(setWkStats).catch(console.error);
    dokumenApi.stats().then(setDocStats).catch(console.error);
  }, []);

  const stats = [
    { label: "Total Dokumen", value: docStats?.total ?? "—", color: "#e0e0e0" },
    { label: "WK Aktif", value: wkStats?.wk_aktif ?? "—", color: "#81c784" },
    { label: "WK Terminasi", value: wkStats?.wk_terminasi ?? "—", color: "#757575" },
    { label: "Total WK", value: wkStats?.total_wk ?? "—", color: "#64b5f6" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#212121", overflowY:"auto" }}>
      <div style={{ background:"#212121", borderBottom:"1px solid #333", padding:"10px 18px", display:"flex", alignItems:"center" }}>
        <div style={{ fontSize:18, fontWeight:400, color:"#e0e0e0", flex:1 }}>Dashboard</div>
        <div style={{ fontSize:10, color:"#555" }}>DBEP-Next · SKK Migas · Spektrum IOG 4.0</div>
      </div>
      <div style={{ padding:16, display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background:"#2a2a2a", border:"1px solid #333", borderRadius:5, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontSize:22, fontWeight:400, color:s.color }}>{typeof s.value==="number" ? s.value.toLocaleString("id-ID") : s.value}</div>
              <div style={{ fontSize:10, color:"#555", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize:10, color:"#555", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Akses Cepat</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {QUICK.map(q => (
              <a key={q.href} href={q.href} style={{ background:"#2a2a2a", border:"1px solid #333", borderLeft:`3px solid ${q.color}`, borderRadius:5, padding:"10px 12px", textDecoration:"none", display:"block" }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#e0e0e0" }}>{q.label}</div>
                <div style={{ fontSize:10, color:"#555", marginTop:2 }}>{q.desc}</div>
              </a>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:"#555", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Unggah Dokumen</div>
          <div style={{ background:"#2a2a2a", border:"2px dashed #333", borderRadius:5, padding:32, textAlign:"center", cursor:"pointer" }}>
            <div style={{ fontSize:12, color:"#555" }}>Seret &amp; lepas file PDF di sini, atau <span style={{ color:"#81c784" }}>pilih file</span></div>
            <div style={{ fontSize:10, color:"#3a3a3a", marginTop:4 }}>PDF, TIFF, JPG — maks 50 MB</div>
          </div>
        </div>
      </div>
    </div>
  );
}
