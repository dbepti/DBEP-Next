"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface KKKS {
  BUSINESS_ASSOCIATE_ID: string;
  BA_LONG_NAME: string;
  BA_SHORT_NAME: string;
  BA_TYPE: string;
  ACTIVE_IND: string;
}

export default function KKKSPage() {
  const [rows, setRows]     = useState<KKKS[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy]   = useState<string>("BUSINESS_ASSOCIATE_ID");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  const load = useCallback(async () => {
    setLoading(true);
    let q = sb.from("BUSINESS_ASSOCIATE")
      .select("BUSINESS_ASSOCIATE_ID,BA_LONG_NAME,BA_SHORT_NAME,BA_TYPE,ACTIVE_IND", { count:"exact" })
      .eq("BA_TYPE","KKKS")
      .order("BA_LONG_NAME")
    if (search) q = q.ilike("BA_LONG_NAME", `%${search}%`);
    const { data, count } = await q;
    setRows(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);


  function handleSort(col: string) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  const sortedRows = [...rows].sort((a, b) => {
    const va = (a as any)[sortBy] ?? "";
    const vb = (b as any)[sortBy] ?? "";
    const cmp = String(va).localeCompare(String(vb));
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#212121", overflow:"hidden" }}>
      {/* Topbar */}
      <div style={{ borderBottom:"1px solid #333", padding:"10px 20px", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ flex:1 }}>
          <span style={{ fontSize:18, fontWeight:400, color:"#e0e0e0" }}>KKKS</span>
          <span style={{ fontSize:11, color:"#555", marginLeft:10 }}>{total.toLocaleString("id-ID")} perusahaan</span>
        </div>
        <input value={search} onChange={e=>{ setSearch(e.target.value); }}
          placeholder="Cari nama KKKS..."
          style={{ width:220, background:"#2a2a2a", border:"1px solid #383838", borderRadius:4, padding:"5px 11px", fontSize:12, color:"#e0e0e0", outline:"none" }} />
        <Link href="/kkks/baru" style={{ padding:"5px 14px", borderRadius:4, fontSize:12, background:"#1b5e20", border:"1px solid #2e7d32", color:"#a5d6a7", textDecoration:"none" }}>
          + KKKS Baru
        </Link>
      </div>

      {/* Tabel */}
      <div style={{ flex:1, overflowY:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead style={{ position:"sticky", top:0, zIndex:10 }}>
            <tr style={{ background:"#1a1a1a", borderBottom:"1px solid #333" }}>
              {([["KSID","100px","BUSINESS_ASSOCIATE_ID"],["Nama KKKS","auto","BA_LONG_NAME"],["Singkatan","160px","BA_SHORT_NAME"],["Status","90px","ACTIVE_IND"]] as [string,string,string][]).map(([h,w,col]) => (
                <th key={h} onClick={() => handleSort(col)} style={{ padding:"8px 12px", textAlign:"left", fontWeight:600, fontSize:10, color:sortBy===col?"#66bb6a":"#666", textTransform:"uppercase", letterSpacing:"0.07em", width:w, whiteSpace:"nowrap", cursor:"pointer", userSelect:"none" }}>{h}{sortBy===col?(sortDir==="asc"?" ▲":" ▼"):" ↕"}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding:40, textAlign:"center", color:"#555" }}>Memuat...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} style={{ padding:40, textAlign:"center", color:"#555" }}>Tidak ada data</td></tr>
            ) : sortedRows.map((k, i) => (
              <tr key={k.BUSINESS_ASSOCIATE_ID}
                style={{ background: i%2===0 ? "#222" : "#212121", borderBottom:"1px solid #2a2a2a" }}
                onMouseEnter={e=>(e.currentTarget.style.background="#2a2a2a")}
                onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#222":"#212121")}>
                <td style={{ padding:"7px 12px" }}>
                  <Link href={`/kkks/${k.BUSINESS_ASSOCIATE_ID}`} style={{ color:"#66bb6a", fontFamily:"monospace", fontSize:12, textDecoration:"none", fontWeight:600 }}>
                    {k.BUSINESS_ASSOCIATE_ID}
                  </Link>
                </td>
                <td style={{ padding:"7px 12px", color:"#e0e0e0" }}>{k.BA_LONG_NAME}</td>
                <td style={{ padding:"7px 12px", color:"#9e9e9e", fontSize:11 }}>{k.BA_SHORT_NAME || "—"}</td>
                <td style={{ padding:"7px 12px" }}>
                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:3,
                    background: k.ACTIVE_IND==="Y" ? "#1b5e2033" : "#37373733",
                    color: k.ACTIVE_IND==="Y" ? "#66bb6a" : "#757575",
                    border: `1px solid ${k.ACTIVE_IND==="Y" ? "#66bb6a55" : "#55555555"}`,
                  }}>{k.ACTIVE_IND==="Y" ? "Aktif" : "Nonaktif"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}
