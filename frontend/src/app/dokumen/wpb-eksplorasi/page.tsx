"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS_COLOR: Record<string, string> = {
  ORIGINAL: "#1565c0",
  REVISI:   "#e65100",
  VALID:    "#1b5e20",
};

function Badge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#333";
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:3,
      background: color + "33", color, border:`1px solid ${color}66` }}>
      {status}
    </span>
  );
}

function DocCard({ doc, selected, onClick }: { doc: any; selected: boolean; onClick: () => void }) {
  const yr = doc.effective_date ? doc.effective_date.slice(0,4) : "—";
  const typeBg: Record<string, string> = {
    WPB_EKSPLORASI: "#1a2a1a", WPB_EKSPLOITASI: "#1a1a2a", AFE: "#2a1a2a",
  };
  return (
    <div onClick={onClick} style={{
      background: selected ? "#2e2e2e" : "#2a2a2a",
      border: selected ? "2px solid #388e3c" : "1px solid #383838",
      borderRadius:6, overflow:"hidden", cursor:"pointer",
    }}>
      {/* Thumbnail */}
      <div style={{ height:110, background: typeBg[doc.item_type] ?? "#1a1a1a",
        position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:"68%", height:"85%", background:"#fff", borderRadius:2,
          padding:5, display:"flex", flexDirection:"column", gap:2, overflow:"hidden" }}>
          {[100,75,55,100,70,40,100].map((w,i) => (
            <div key={i} style={{ height:2, width:`${w}%`,
              background: i%2===0 ? "#e0e0e0" : "#bdbdbd", borderRadius:1 }} />
          ))}
        </div>
        <div style={{ position:"absolute", top:5, left:5, display:"flex", flexWrap:"wrap", gap:2 }}>
          <span style={{ fontSize:8, fontWeight:700, padding:"1px 5px", borderRadius:2,
            background:"#1565c0", color:"#e3f2fd" }}>
            {doc.item_type?.replace('_',' ') ?? 'WPB'}
          </span>
          <Badge status={doc.active_ind ?? 'ORIGINAL'} />
        </div>
        <div style={{ position:"absolute", bottom:4, right:5, fontSize:8,
          color:"#fff", background:"rgba(0,0,0,.5)", padding:"1px 4px", borderRadius:2 }}>
          {yr}
        </div>
      </div>
      {/* Body */}
      <div style={{ padding:"7px 8px" }}>
        <div style={{ fontSize:10, color:"#66bb6a", fontWeight:500, marginBottom:1 }}>
          {doc.land_right_id ?? "—"}
        </div>
        <div style={{ fontSize:10, color:"#bdbdbd", lineHeight:1.4, marginBottom:3,
          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {doc.item_name}
        </div>
        <div style={{ fontSize:9, color:"#555" }}>{yr}</div>
      </div>
      {/* Actions */}
      <div style={{ display:"flex", borderTop:"1px solid #333" }}>
        {["✏ Edit","👁 Lihat","⬇ Unduh"].map(a => (
          <button key={a} onClick={e => e.stopPropagation()} style={{
            flex:1, padding:"4px 2px", background:"transparent", border:"none",
            cursor:"pointer", color:"#555", fontSize:9, textAlign:"center"
          }}>{a}</button>
        ))}
      </div>
    </div>
  );
}

export default function WpbEksplorasi() {
  const [docs, setDocs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [page, setPage] = useState(0);
  const PAGE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    let q = sb.from("rm_information_item")
      .select("*", { count: "exact" })
      .eq("item_type", "WPB_EKSPLORASI")
      .order("effective_date", { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);

    if (filterStatus) q = q.eq("active_ind", filterStatus);
    if (filterTahun)  q = q.gte("effective_date", `${filterTahun}-01-01`)
                           .lte("effective_date", `${filterTahun}-12-31`);
    if (search)       q = q.ilike("item_name", `%${search}%`);

    const { data, count } = await q;
    setDocs(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, filterStatus, filterTahun, search]);

  useEffect(() => { load(); }, [load]);

  const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));
  const chip = (label: string, val: string, cur: string, set: (v:string)=>void) => (
    <span key={label} onClick={() => { set(cur===val ? "" : val); setPage(0); }}
      style={{ background: cur===val ? "#1b5e20" : "#2a2a2a",
        border: `1px solid ${cur===val ? "#2e7d32" : "#383838"}`,
        color: cur===val ? "#a5d6a7" : "#9e9e9e",
        borderRadius:4, padding:"3px 8px", fontSize:11, cursor:"pointer" }}>
      {label}
    </span>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#212121", overflow:"hidden" }}>
      {/* Topbar */}
      <div style={{ background:"#212121", borderBottom:"1px solid #333", padding:"10px 16px",
        display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ fontSize:18, fontWeight:400, color:"#e0e0e0", flex:1 }}>
          WP&amp;B Eksplorasi
          <span style={{ fontSize:11, color:"#555", marginLeft:8 }}>{total.toLocaleString("id-ID")} dokumen</span>
        </div>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Cari WK, perihal..."
          style={{ width:200, background:"#2a2a2a", border:"1px solid #383838",
            borderRadius:4, padding:"5px 10px", fontSize:12, color:"#e0e0e0", outline:"none" }} />
        <button style={{ padding:"5px 12px", borderRadius:4, fontSize:12,
          background:"#1b5e20", border:"1px solid #2e7d32", color:"#a5d6a7", cursor:"pointer" }}>
          + Tambah
        </button>
      </div>

      {/* Filters */}
      <div style={{ background:"#212121", borderBottom:"1px solid #333",
        padding:"6px 16px", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:11, color:"#555" }}>Status:</span>
        {chip("Semua","",filterStatus,setFilterStatus)}
        {["ORIGINAL","REVISI","VALID"].map(s => chip(s,s,filterStatus,setFilterStatus))}
        <span style={{ color:"#333", margin:"0 4px" }}>|</span>
        <span style={{ fontSize:11, color:"#555" }}>Tahun:</span>
        {chip("Semua","",filterTahun,setFilterTahun)}
        {years.map(y => chip(y,y,filterTahun,setFilterTahun))}
        <span style={{ marginLeft:"auto", fontSize:11, color:"#555" }}>
          {loading ? "Memuat..." : `${docs.length} dari ${total.toLocaleString("id-ID")}`}
        </span>
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center",
            height:200, color:"#555", fontSize:13 }}>Memuat...</div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,minmax(0,1fr))", gap:10 }}>
            {docs.map(d => (
              <DocCard key={d.information_item_id} doc={d}
                selected={selected?.information_item_id === d.information_item_id}
                onClick={() => setSelected(d)} />
            ))}
          </div>
        )}
        {/* Pagination */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, padding:"16px 0" }}>
          <button disabled={page===0} onClick={() => setPage(p=>p-1)}
            style={{ padding:"5px 14px", borderRadius:4, border:"1px solid #383838",
              background: page===0 ? "#1a1a1a" : "#2a2a2a", color: page===0 ? "#444" : "#9e9e9e",
              cursor: page===0 ? "default" : "pointer", fontSize:12 }}>← Prev</button>
          <span style={{ padding:"5px 10px", fontSize:12, color:"#555" }}>
            Hal {page+1} / {Math.ceil(total/PAGE)}
          </span>
          <button disabled={(page+1)*PAGE>=total} onClick={() => setPage(p=>p+1)}
            style={{ padding:"5px 14px", borderRadius:4, border:"1px solid #383838",
              background:(page+1)*PAGE>=total ? "#1a1a1a" : "#2a2a2a",
              color:(page+1)*PAGE>=total ? "#444" : "#9e9e9e",
              cursor:(page+1)*PAGE>=total ? "default" : "pointer", fontSize:12 }}>Next →</button>
        </div>
      </div>
    </div>
  );
}
