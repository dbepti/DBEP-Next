"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: "⊞" },
  { label: "Dokumen", href: "/dokumen", icon: "📄", count: 2867 },
  { section: "Saved Views" },
  { label: "Baru Ditambah", href: "/dokumen?sort=created", icon: "🕐", sub: true },
  { label: "Inbox", href: "/dokumen?status=inbox", icon: "📥", sub: true },
  { section: "Eksplorasi" },
  { label: "WP&B Eksplorasi", href: "/dokumen/wpb-eksplorasi", icon: "·", sub: true, count: 1204 },
  { label: "AFE", href: "/dokumen/afe", icon: "·", sub: true, count: 892 },
  { label: "Resources (P/L)", href: "/dokumen/resources", icon: "·", sub: true },
  { section: "Development" },
  { label: "POD / POP", href: "/dokumen/pod", icon: "·", sub: true },
  { label: "PMF / EOR", href: "/dokumen/pmf", icon: "·", sub: true },
  { section: "Eksploitasi" },
  { label: "WP&B Eksploitasi", href: "/dokumen/wpb-eksploitasi", icon: "·", sub: true },
  { label: "AFE", href: "/dokumen/afe-eksploitasi", icon: "·", sub: true },
  { label: "Cadangan Migas", href: "/dokumen/cadangan", icon: "·", sub: true },
  { section: "Kelola" },
  { label: "KKKS", href: "/kkks", icon: "🏢" },
  { label: "Wilayah Kerja", href: "/wk", icon: "🗺" },
  { label: "Pencarian AI", href: "/search", icon: "🔍" },
  { label: "Pengaturan", href: "/settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside style={{ width:190, background:"#212121", borderRight:"1px solid #333", display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto" }}>
      <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:24, height:24, background:"#388e3c", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#e8f5e9", flexShrink:0 }}>D</div>
        <div>
          <div style={{ fontSize:13, fontWeight:500, color:"#e0e0e0" }}>DBEP-Next</div>
          <div style={{ fontSize:9, color:"#555", marginTop:1 }}>SKK Migas · IOG 4.0</div>
        </div>
      </div>
      <nav style={{ flex:1 }}>
        {NAV.map((item, i) => {
          if ("section" in item) return (
            <div key={i} style={{ padding:"10px 14px 3px", fontSize:9, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.09em" }}>{item.section}</div>
          );
          const active = pathname === item.href || pathname.startsWith(item.href + "?");
          return (
            <Link key={item.href} href={item.href} style={{ padding: item.sub ? "6px 14px 6px 24px" : "7px 14px", fontSize:12, color: active ? "#81c784" : "#9e9e9e", background: active ? "#2a2a2a" : "transparent", display:"flex", alignItems:"center", gap:7, textDecoration:"none" }}>
              <span style={{ fontSize: item.icon === "·" ? 16 : 12, opacity:0.6, flexShrink:0, lineHeight:1 }}>{item.icon}</span>
              <span style={{ flex:1 }}>{item.label}</span>
              {"count" in item && item.count && (
                <span style={{ background:"#2a2a2a", color:"#555", fontSize:9, padding:"1px 5px", borderRadius:8, border:"1px solid #333" }}>{(item.count as number).toLocaleString("id-ID")}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding:"8px 14px", borderTop:"1px solid #333", display:"flex", alignItems:"center", gap:7 }}>
        <div style={{ width:22, height:22, borderRadius:"50%", background:"#1b5e20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:600, color:"#a5d6a7", flexShrink:0 }}>HM</div>
        <div>
          <div style={{ fontSize:11, color:"#9e9e9e" }}>Heru Murdha...</div>
          <div style={{ fontSize:9, color:"#555" }}>Analis Data WK</div>
        </div>
      </div>
    </aside>
  );
}
