"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS_COLOR: Record<string, string> = {
  ORIGINAL: "#66bb6a", REVISI: "#ffa726", REVISI2: "#ef5350",
  DRAFT: "#78909c", FINAL: "#42a5f5",
};

const AFE_TYPES = [
  "AFE_PEMBORAN_EPT","AFE_PEMBORAN_EKS","AFE_FASPROD",
  "AFE_WORKOVER","AFE_STUDI","AFE_SURVAI","AFE_NON_EPT","AFE_NON_EKS",
];

const AFE_LABEL: Record<string, string> = {
  AFE_PEMBORAN_EPT: "Pemboran Eksploitasi",
  AFE_PEMBORAN_EKS: "Pemboran Eksplorasi",
  AFE_FASPROD: "Fasilitas Produksi",
  AFE_WORKOVER: "Workover",
  AFE_STUDI: "Studi",
  AFE_SURVAI: "Survai Seismik",
  AFE_NON_EPT: "Non Eksploitasi",
  AFE_NON_EKS: "Non Eksplorasi",
};

const COL = "25% 33% 27% 7% 8%";

export default function AFEPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [filterWK, setFilterWK] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [wkList, setWkList] = useState<any[]>([]);
  const PAGE = 50;

  useEffect(() => {
    sb.from("v_dokumen").select("wkid,nama_wk").like("item_type","AFE_%").not("wkid","is",null)
      .then(({ data }) => {
        if (!data) return;
        const unique = Array.from(new Map(data.map((d:any) => [d.wkid, d])).values())
          .sort((a:any,b:any) => (a.nama_wk||"").localeCompare(b.nama_wk||""));
        setWkList(unique as any[]);
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let q = sb.from("v_dokumen").select("*", { count: "exact" })
      .like("item_type","AFE_%")
      .order("effective_date", { ascending: false })
      .range(page * PAGE, (page+1) * PAGE - 1);
    if (filterWK) q = q.eq("wkid", filterWK);
    if (filterTahun) q = q.gte("effective_date",`${filterTahun}-01-01`).lte("effective_date",`${filterTahun}-12-31`);
    if (filterStatus) q = q.eq("doc_status", filterStatus);
    if (filterType) q = q.eq("item_type", filterType);
    if (search) q = q.ilike("item_name", `%${search}%`);
    const { data, count } = await q;
    setDocs(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, filterWK, filterTahun, filterStatus, filterType, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); setSelected(null); }, [filterWK, filterTahun, filterStatus, filterType, search]);

  const years = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i));
  const totalPages = Math.ceil(total / PAGE);
  const ss = (active: boolean) => ({
    background: "#2a2a2a" as const, border: `1px solid ${active?"#4caf50":"#383838"}`,
    borderRadius: 5, padding: "5px 8px", color: active?"#a5d6a7":"#555",
    fontSize: 11, outline: "none" as const, cursor: "pointer" as const,
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#1a1a1a", overflow:"hidden" }}>

      {/* Toolbar */}
      <div style={{ padding:"8px 16px", borderBottom:"1px solid #2a2a2a", background:"#212121", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", flexShrink:0 }}>
        <span style={{ fontSize:13, color:"#e0e0e0", fontWeight:500 }}>AFE</span>
        <span style={{ fontSize:11, color:"#444" }}>{loading?"...":`${total.toLocaleString("id-ID")} dokumen`}</span>
        <div style={{ width:1, height:16, background:"#333", margin:"0 4px" }}/>
        <select value={filterWK} onChange={e=>setFilterWK(e.target.value)} style={ss(!!filterWK)}>
          <option value="">Semua WK</option>
          {wkList.map((w:any)=><option key={w.wkid} value={w.wkid}>{w.nama_wk}</option>)}
        </select>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={ss(!!filterType)}>
          <option value="">Semua Tipe</option>
          {AFE_TYPES.map(t=><option key={t} value={t}>{AFE_LABEL[t]}</option>)}
        </select>
        <select value={filterTahun} onChange={e=>setFilterTahun(e.target.value)} style={ss(!!filterTahun)}>
          <option value="">Semua Tahun</option>
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={ss(!!filterStatus)}>
          <option value="">Semua Status</option>
          {["ORIGINAL","REVISI","REVISI2","DRAFT","FINAL"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari judul..."
          style={{ background:"#2a2a2a", border:"1px solid #383838", borderRadius:5, padding:"5px 10px", color:"#e0e0e0", fontSize:11, width:150, outline:"none" }}/>
        {(filterWK||filterTahun||filterStatus||filterType||search) &&
          <button onClick={()=>{setFilterWK("");setFilterTahun("");setFilterStatus("");setFilterType("");setSearch("");}}
            style={{ background:"none", border:"1px solid #383838", borderRadius:4, padding:"4px 8px", color:"#666", fontSize:10, cursor:"pointer" }}>✕ Reset</button>}
      </div>

      {/* Split layout */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* LIST — atas */}
        <div style={{ flex:"0 0 55%", display:"flex", flexDirection:"column", overflow:"hidden", borderBottom:"1px solid #2a2a2a" }}>
          <div style={{ display:"grid", gridTemplateColumns:COL, gap:8, padding:"5px 16px", background:"#1e1e1e", borderBottom:"1px solid #252525", fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:"0.5px", flexShrink:0 }}>
            <span>Wilayah Kerja</span><span>Judul Dokumen</span><span>KKKS</span><span>Tahun</span><span>Status</span>
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {loading ? <div style={{ padding:32, textAlign:"center", color:"#333", fontSize:12 }}>Memuat...</div>
            : docs.length===0 ? <div style={{ padding:32, textAlign:"center", color:"#333", fontSize:12 }}>Tidak ada dokumen</div>
            : docs.map(doc => {
              const isSel = selected?.information_item_id === doc.information_item_id;
              const yr = doc.effective_date?.slice(0,4)??"—";
              return (
                <div key={doc.information_item_id} onClick={()=>setSelected(isSel?null:doc)}
                  style={{ display:"grid", gridTemplateColumns:COL, gap:8, padding:"5px 16px", borderBottom:"1px solid #1e1e1e", cursor:"pointer", background:isSel?"#1a2d1a":"transparent", borderLeft:`2px solid ${isSel?"#4caf50":"transparent"}` }}
                  onMouseEnter={e=>{if(!isSel)(e.currentTarget as HTMLElement).style.background="#222";}}
                  onMouseLeave={e=>{if(!isSel)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                  <span style={{ fontSize:11, color:"#66bb6a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={doc.wkid}>{doc.nama_wk??doc.wkid??"—"}</span>
                  <span style={{ fontSize:11, color:"#bbb", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={doc.item_name}>{doc.item_name}</span>
                  <span style={{ fontSize:11, color:"#666", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={doc.nama_kkks}>{doc.nama_kkks??"—"}</span>
                  <span style={{ fontSize:11, color:"#666" }}>{yr}</span>
                  <span style={{ fontSize:10, color:STATUS_COLOR[doc.doc_status]??"#555" }}>● {doc.doc_status}</span>
                </div>
              );
            })}
          </div>
          {/* Paginasi */}
          <div style={{ padding:"5px 16px", borderTop:"1px solid #222", background:"#1e1e1e", display:"flex", alignItems:"center", flexShrink:0 }}>
            <span style={{ color:"#3a3a3a", fontSize:11 }}>Hal {page+1}/{totalPages||1} · {total.toLocaleString("id-ID")} dokumen</span>
            <div style={{ marginLeft:"auto", display:"flex", gap:3 }}>
              {[{l:"«",a:()=>setPage(0),d:page===0},{l:"‹",a:()=>setPage(p=>Math.max(0,p-1)),d:page===0}].map(b=>(
                <button key={b.l} onClick={b.a} disabled={b.d} style={{background:"#2a2a2a",border:"1px solid #252525",borderRadius:4,padding:"2px 7px",color:b.d?"#252525":"#555",cursor:b.d?"default":"pointer",fontSize:11}}>{b.l}</button>
              ))}
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                const p=Math.max(0,Math.min(page-2,totalPages-5))+i;
                return <button key={p} onClick={()=>setPage(p)} style={{background:p===page?"#1b3a1f":"#2a2a2a",border:`1px solid ${p===page?"#2e7d32":"#252525"}`,borderRadius:4,padding:"2px 7px",color:p===page?"#66bb6a":"#444",cursor:"pointer",fontSize:11}}>{p+1}</button>;
              })}
              {[{l:"›",a:()=>setPage(p=>Math.min(totalPages-1,p+1)),d:page>=totalPages-1},{l:"»",a:()=>setPage(totalPages-1),d:page>=totalPages-1}].map(b=>(
                <button key={b.l} onClick={b.a} disabled={b.d} style={{background:"#2a2a2a",border:"1px solid #252525",borderRadius:4,padding:"2px 7px",color:b.d?"#252525":"#555",cursor:b.d?"default":"pointer",fontSize:11}}>{b.l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* VIEWER — bawah */}
        <div style={{ flex:"0 0 45%", display:"flex", flexDirection:"column", overflow:"hidden", background:"#1c1c1c" }}>
          <div style={{ padding:"6px 16px", background:"#1e1e1e", borderBottom:"1px solid #252525", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <span style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:"0.5px" }}>Dokumen Viewer</span>
            {selected && (
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {selected?.wkid && <a href={`/wk/${selected.wkid}`} style={{ fontSize:11, color:"#66bb6a", textDecoration:"none" }}>→ Lihat WK</a>}
                <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
              </div>
            )}
          </div>
          <div style={{ flex:1, overflow:"auto", padding:"16px 20px" }}>
            {!selected ? (
              <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>📄</div>
                <div style={{ fontSize:13, color:"#383838" }}>Pilih dokumen untuk ditampilkan</div>
                <div style={{ fontSize:11, color:"#2a2a2a", marginTop:4 }}>Klik salah satu baris di atas</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize:15, color:"#66bb6a", fontWeight:500, marginBottom:16 }}>{selected.nama_wk??selected.wkid}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"2px 32px" }}>
                  {[
                    ["KKKS", selected.nama_kkks],
                    ["Tipe AFE", AFE_LABEL[selected.item_type]??selected.item_type],
                    ["Perihal", selected.item_name],
                    ["Status", selected.doc_status],
                    ["Tahun", selected.effective_date?.slice(0,4)],
                    ["No. Dokumen", selected.reference_num],
                    ["Tgl. Terbit", selected.issue_date],
                    ["ID Dokumen", selected.information_item_id],
                  ].map(([lbl,val])=>!val?null:(
                    <div key={lbl as string} style={{ display:"flex", borderBottom:"1px solid #222", padding:"6px 0", alignItems:"flex-start" }}>
                      <span style={{ fontSize:12, color:"#555", width:130, flexShrink:0 }}>{lbl}</span>
                      <span style={{ fontSize:12, color:lbl==="Status"?(STATUS_COLOR[val as string]??"#ccc"):"#ccc", wordBreak:"break-word" }}>
                        {lbl==="Status"?`● ${val}`:`${val}`}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:16, padding:14, background:"#1a1a1a", borderRadius:6, border:"1px dashed #252525", textAlign:"center" }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>📄</div>
                  <div style={{ fontSize:11, color:"#3a3a3a" }}>Preview file belum tersedia · Unggah via modul DMS</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
