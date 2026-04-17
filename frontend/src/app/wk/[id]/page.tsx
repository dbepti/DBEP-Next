"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface WKDetail {
  wkid: string; nama_wk: string; tipe_kontrak: string; aktif: string;
  status_wk: string; lokasi: string; fase: string;
  tgl_efektif: string|null; tgl_berakhir: string|null; tgl_ttd: string|null;
  luas_km2: number|null; satuan_luas: string|null;
  operator_utama: string|null; semua_operator_aktif: string|null; jumlah_operator: number;
}
interface Operator {
  ksid: string; nama_kkks: string; aktif: boolean;
  tgl_efektif: string|null; tgl_berakhir: string|null; obs_no: number;
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display:"flex", padding:"8px 0", borderBottom:"1px solid #2a2a2a" }}>
      <div style={{ width:180, fontSize:11, color:"#666", flexShrink:0, paddingTop:1 }}>{label}</div>
      <div style={{ fontSize:12, color:"#e0e0e0", fontFamily: mono ? "monospace" : undefined }}>{value || <span style={{color:"#444"}}>—</span>}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, [string, string]> = {
    ACTIVE:      ["#1b5e2033","#66bb6a"],
    TERMINATED:  ["#37373733","#757575"],
    TERMINATING: ["#e6510022","#ff8a65"],
  };
  const [bg, col] = cfg[status] ?? ["#2a2a2a","#9e9e9e"];
  return <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:3, background:bg, color:col, border:`1px solid ${col}55` }}>{status}</span>;
}

function TipeBadge({ tipe }: { tipe: string }) {
  const colors: Record<string, string> = { PSC:"#1565c0","PSC-EXT":"#0277bd",PTM:"#6a1b9a",JOB:"#bf360c",JOA:"#e65100",COW:"#1a237e" };
  const c = colors[tipe] ?? "#37474f";
  return <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:3, background:c+"33", color:c, border:`1px solid ${c}66` }}>{tipe}</span>;
}

export default function WKDetailPage() {
  const { id }     = useParams<{ id: string }>();
  const router     = useRouter();
  const [wk, setWk]       = useState<WKDetail|null>(null);
  const [ops, setOps]     = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTermModal, setShowTermModal] = useState(false);
  const [termDate, setTermDate]   = useState("");
  const [termAlasan, setTermAlasan] = useState("");
  const [termSurat, setTermSurat]   = useState("");
  const [termLoading, setTermLoading] = useState(false);
  const [termMsg, setTermMsg]         = useState("");
  const [dokumen, setDokumen] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Load dari view (frontend langsung ke Supabase)
      const { data: wkData } = await sb.from("v_wk_lengkap").select("*").eq("wkid", id).single();
      setWk(wkData ?? null);

      // Fetch dokumen terkait WK ini
      const { data: docData } = await sb.from("v_dokumen")
        .select("information_item_id,item_type,item_name,effective_date,doc_status")
        .eq("wkid", id);
      setDokumen(docData ?? []);

      // Load operatorship
      const { data: opsData } = await sb.from("INT_SET_PARTNER")
        .select("PARTNER_BA_ID,PARTNER_OBS_NO,ACTIVE_IND,EFFECTIVE_DATE,EXPIRY_DATE")
        .eq("INTEREST_SET_ID", id).eq("INTEREST_SET_ROLE","OPERATOR")
        .order("PARTNER_OBS_NO");

      if (opsData?.length) {
        const baIds = opsData.map((o:any) => o.PARTNER_BA_ID);
        const { data: baData } = await sb.from("BUSINESS_ASSOCIATE")
          .select("BUSINESS_ASSOCIATE_ID,BA_LONG_NAME")
          .in("BUSINESS_ASSOCIATE_ID", baIds);
        const baMap: Record<string,string> = {};
        (baData||[]).forEach((b:any) => { baMap[b.BUSINESS_ASSOCIATE_ID] = b.BA_LONG_NAME; });
        setOps(opsData.map((o:any) => ({
          ksid: o.PARTNER_BA_ID,
          nama_kkks: baMap[o.PARTNER_BA_ID] || o.PARTNER_BA_ID,
          aktif: o.ACTIVE_IND === "Y",
          tgl_efektif: o.EFFECTIVE_DATE,
          tgl_berakhir: o.EXPIRY_DATE,
          obs_no: o.PARTNER_OBS_NO,
        })));
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function doTerminasi() {
    if (!termDate) { setTermMsg("Tanggal terminasi wajib diisi"); return; }
    setTermLoading(true); setTermMsg("");
    try {
      const res = await fetch(`${API}/api/wk/${id}/terminasi`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ tgl_terminasi: termDate, alasan: termAlasan, nomor_surat: termSurat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal terminasi");
      setTermMsg("✅ " + data.message);
      setTimeout(() => { setShowTermModal(false); router.refresh(); }, 1500);
    } catch (e: any) {
      setTermMsg("❌ " + e.message);
    } finally { setTermLoading(false); }
  }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", background:"#212121", color:"#555", fontSize:13 }}>
      Memuat data WK {id}...
    </div>
  );

  if (!wk) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", background:"#212121", gap:12 }}>
      <div style={{ fontSize:32, color:"#333" }}>🗺</div>
      <div style={{ fontSize:14, color:"#757575" }}>WK '{id}' tidak ditemukan</div>
      <Link href="/wk" style={{ fontSize:12, color:"#66bb6a" }}>← Kembali ke daftar</Link>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#212121", overflow:"hidden" }}>

      {/* Topbar */}
      <div style={{ background:"#212121", borderBottom:"1px solid #333", padding:"10px 20px", display:"flex", alignItems:"center", gap:10 }}>
        <Link href="/wk" style={{ color:"#555", fontSize:12, textDecoration:"none", marginRight:4 }}>← Wilayah Kerja</Link>
        <span style={{ color:"#333" }}>/</span>
        <span style={{ fontSize:13, color:"#9e9e9e", fontFamily:"monospace", marginLeft:4 }}>{wk.wkid}</span>
        <span style={{ fontSize:16, fontWeight:400, color:"#e0e0e0", marginLeft:8, flex:1 }}>{wk.nama_wk}</span>
        <StatusBadge status={wk.status_wk} />
        <div style={{ display:"flex", gap:8, marginLeft:12 }}>
          <Link href={`/wk/${id}/edit`} style={{
            padding:"5px 14px", borderRadius:4, fontSize:12,
            background:"#1b5e20", border:"1px solid #2e7d32",
            color:"#a5d6a7", textDecoration:"none", cursor:"pointer",
          }}>✏ Edit</Link>
          {wk.aktif === "Y" && (
            <button onClick={() => setShowTermModal(true)} style={{
              padding:"5px 14px", borderRadius:4, fontSize:12,
              background:"#37373733", border:"1px solid #b71c1c66",
              color:"#ef9a9a", cursor:"pointer",
            }}>⊗ Terminasi WK</button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", gap:20 }}>

        {/* Kolom kiri: Info WK */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ background:"#2c2c2c", border:"1px solid #3a3a3a", borderRadius:8, padding:"16px 18px", marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Informasi Kontrak</div>
            <InfoRow label="WKID"          value={<span style={{fontFamily:"monospace",color:"#66bb6a"}}>{wk.wkid}</span>} />
            <InfoRow label="Nama WK"       value={wk.nama_wk} />
            <InfoRow label="Tipe Kontrak"  value={<TipeBadge tipe={wk.tipe_kontrak} />} />
            <InfoRow label="Status"        value={<StatusBadge status={wk.status_wk} />} />
            <InfoRow label="Lokasi"        value={wk.lokasi} />
            <InfoRow label="Fase"          value={wk.fase} />
            <InfoRow label="Tgl Ditandatangani" value={wk.tgl_ttd?.slice(0,10)} />
            <InfoRow label="Tgl Efektif"   value={wk.tgl_efektif?.slice(0,10)} />
            <InfoRow label="Tgl Berakhir"  value={
              wk.tgl_berakhir
                ? <span style={{ color: wk.aktif==="Y" ? "#ef9a9a" : "#757575" }}>{wk.tgl_berakhir.slice(0,10)}</span>
                : null
            } />
            <InfoRow label="Luas Asal"     value={wk.luas_km2 ? `${wk.luas_km2.toLocaleString("id-ID")} km²` : null} />
          </div>
        </div>

        {/* Kolom kanan: Riwayat Operator */}
        <div style={{ width:380, flexShrink:0 }}>
          <div style={{ background:"#2c2c2c", border:"1px solid #3a3a3a", borderRadius:8, padding:"16px 18px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", flex:1 }}>Riwayat Operator</div>
              {wk.aktif === "Y" && (
                <Link href={`/wk/${id}/edit?tab=operator`} style={{ fontSize:11, color:"#66bb6a", textDecoration:"none" }}>+ Ganti Operator</Link>
              )}
            </div>
            {ops.length === 0 ? (
              <div style={{ fontSize:12, color:"#444", textAlign:"center", padding:16 }}>Tidak ada data operator</div>
            ) : ops.map(op => (
              <div key={op.obs_no} style={{
                padding:"10px 12px", borderRadius:6, marginBottom:8,
                background: op.aktif ? "#1b5e2015" : "#2a2a2a",
                border: `1px solid ${op.aktif ? "#2e7d3255" : "#333"}`,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{
                    fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:2,
                    background: op.aktif ? "#1b5e20" : "#333",
                    color: op.aktif ? "#a5d6a7" : "#555",
                  }}>{op.aktif ? "AKTIF" : "EXPIRED"}</span>
                  <span style={{ fontSize:10, color:"#555" }}>#{op.obs_no}</span>
                </div>
                <div style={{ fontSize:12, color: op.aktif ? "#e0e0e0" : "#757575", fontWeight: op.aktif ? 500 : 400 }}>
                  {op.nama_kkks}
                </div>
                <div style={{ fontSize:10, color:"#555", marginTop:3 }}>
                  {op.tgl_efektif?.slice(0,7) || "—"} → {op.tgl_berakhir?.slice(0,7) || "sekarang"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section Dokumen Terkait */}
      <div style={{ padding:"0 20px 20px" }}>
        <div style={{ background:"#1e1e1e", border:"1px solid #2a2a2a", borderRadius:8, padding:16 }}>
          <div style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
            <span>Dokumen Terkait</span>
            <span style={{ fontSize:10, color:"#444", fontWeight:400 }}>{dokumen.length} dokumen</span>
          </div>
          {dokumen.length === 0 ? (
            <div style={{ fontSize:12, color:"#444", padding:"20px 0" }}>Belum ada dokumen untuk WK ini.</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:10 }}>
              {(() => {
                const byType: Record<string, any[]> = dokumen.reduce((acc:any, d:any) => {
                  const t = d.item_type ?? "LAINNYA";
                  (acc[t] ??= []).push(d);
                  return acc;
                }, {});

                type Grp = { key:string; label:string; route:string; subs?:{type:string;label:string}[] };
                const GROUPS: Grp[] = [
                  { key:"WPB_EKSPLORASI",   label:"WP&B Eksplorasi",   route:"wpb-eksplorasi" },
                  {
                    key:"AFE_EKSPLORASI",   label:"AFE Eksplorasi",    route:"afe",
                    subs:[
                      { type:"AFE_STUDI",         label:"AFE Studi" },
                      { type:"AFE_SURVAI",        label:"AFE Survai" },
                      { type:"AFE_PEMBORAN_EKS",  label:"AFE Pemboran Eks" },
                    ],
                  },
                  { key:"WPB_EKSPLOITASI",  label:"WP&B Eksploitasi",  route:"wpb-eksploitasi" },
                  {
                    key:"AFE_EKSPLOITASI",  label:"AFE Eksploitasi",   route:"afe-eksploitasi",
                    subs:[
                      { type:"AFE_PEMBORAN_EPT",  label:"AFE Pemboran Ept" },
                      { type:"AFE_WORKOVER",      label:"AFE Workover" },
                      { type:"AFE_FASPROD",       label:"AFE Fasilitas Produksi" },
                      { type:"AFE_NON_EPT",       label:"Non-AFE Ept" },
                    ],
                  },
                  {
                    key:"POD_GROUP",        label:"POD / POP / POFD",  route:"pod",
                    subs:[
                      { type:"POD",  label:"POD" },
                      { type:"POP",  label:"POP" },
                      { type:"POFD", label:"POFD" },
                    ],
                  },
                  {
                    key:"PMF_GROUP",        label:"PMF / EOR",         route:"pmf",
                    subs:[
                      { type:"PMF", label:"PMF" },
                      { type:"EOR", label:"EOR" },
                    ],
                  },
                  { key:"RESOURCES_PL",     label:"Resources P/L",     route:"resources" },
                  { key:"CADANGAN",         label:"Cadangan Migas",    route:"cadangan" },
                ];

                const countGrp = (g:Grp) => g.subs
                  ? g.subs.reduce((s,x)=>s+(byType[x.type]?.length??0),0)
                  : (byType[g.key]?.length??0);

                const visible = GROUPS.filter(g => countGrp(g) > 0);

                return visible.map((g) => {
                  const total = countGrp(g);
                  if (g.subs) {
                    return (
                      <div key={g.key} style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:6, padding:"10px 12px", display:"flex", flexDirection:"column" }}>
                        <div style={{ fontSize:9, color:"#444", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.5px" }}>{g.label}</div>
                        <div style={{ fontSize:20, color:"#66bb6a", fontWeight:600, marginBottom:6 }}>{total}</div>
                        <div style={{ borderTop:"1px solid #252525", paddingTop:6, display:"flex", flexDirection:"column", gap:3 }}>
                          {g.subs.map((s) => {
                            const n = byType[s.type]?.length ?? 0;
                            const href = `/dokumen/${g.route}?wkid=${id}&type=${s.type}`;
                            return (
                              <a key={s.type} href={href}
                                 style={{
                                   display:"flex", justifyContent:"space-between", alignItems:"center",
                                   fontSize:10, textDecoration:"none",
                                   color: n>0 ? "#9e9e9e" : "#444",
                                   padding:"2px 0",
                                   pointerEvents: n>0 ? "auto" : "none",
                                 }}>
                                <span>{s.label}</span>
                                <span style={{ color: n>0 ? "#e0e0e0" : "#444", fontFamily:"monospace" }}>{n}</span>
                              </a>
                            );
                          })}
                        </div>
                        <a href={`/dokumen/${g.route}?wkid=${id}`}
                           style={{ fontSize:10, color:"#42a5f5", textDecoration:"none", marginTop:6, borderTop:"1px solid #252525", paddingTop:5 }}>
                          Lihat semua →
                        </a>
                      </div>
                    );
                  }
                  return (
                    <div key={g.key} style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:6, padding:"10px 12px" }}>
                      <div style={{ fontSize:9, color:"#444", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>{g.label}</div>
                      <div style={{ fontSize:20, color:"#66bb6a", fontWeight:600, marginBottom:4 }}>{total}</div>
                      <a href={`/dokumen/${g.route}?wkid=${id}&type=${g.key}`} style={{ fontSize:10, color:"#42a5f5", textDecoration:"none" }}>
                        Lihat →
                      </a>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Modal Terminasi */}
      {showTermModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#2c2c2c", border:"1px solid #b71c1c44", borderRadius:10, padding:24, width:400, maxWidth:"90vw" }}>
            <div style={{ fontSize:16, fontWeight:500, color:"#ef9a9a", marginBottom:16 }}>⊗ Terminasi WK {id}</div>
            <div style={{ fontSize:12, color:"#9e9e9e", marginBottom:16 }}>
              Tindakan ini akan menonaktifkan WK dan semua operator aktifnya. Data historis tetap tersimpan.
            </div>
            <label style={{ fontSize:11, color:"#757575", display:"block", marginBottom:4 }}>Tanggal Terminasi *</label>
            <input type="date" value={termDate} onChange={e => setTermDate(e.target.value)}
              style={{ width:"100%", background:"#1a1a1a", border:"1px solid #444", borderRadius:4, padding:"6px 10px", color:"#e0e0e0", fontSize:12, marginBottom:12, boxSizing:"border-box" }} />
            <label style={{ fontSize:11, color:"#757575", display:"block", marginBottom:4 }}>Nomor Surat Keputusan</label>
            <input value={termSurat} onChange={e => setTermSurat(e.target.value)} placeholder="contoh: SK-123/SBU/2025"
              style={{ width:"100%", background:"#1a1a1a", border:"1px solid #444", borderRadius:4, padding:"6px 10px", color:"#e0e0e0", fontSize:12, marginBottom:12, boxSizing:"border-box" }} />
            <label style={{ fontSize:11, color:"#757575", display:"block", marginBottom:4 }}>Alasan / Catatan</label>
            <textarea value={termAlasan} onChange={e => setTermAlasan(e.target.value)} rows={3}
              style={{ width:"100%", background:"#1a1a1a", border:"1px solid #444", borderRadius:4, padding:"6px 10px", color:"#e0e0e0", fontSize:12, marginBottom:12, resize:"none", boxSizing:"border-box" }} />
            {termMsg && <div style={{ fontSize:12, color: termMsg.startsWith("✅") ? "#66bb6a" : "#ef9a9a", marginBottom:10 }}>{termMsg}</div>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => setShowTermModal(false)} style={{ padding:"6px 16px", borderRadius:4, background:"transparent", border:"1px solid #444", color:"#9e9e9e", cursor:"pointer", fontSize:12 }}>Batal</button>
              <button onClick={doTerminasi} disabled={termLoading} style={{ padding:"6px 16px", borderRadius:4, background:"#b71c1c", border:"1px solid #c62828", color:"#ffcdd2", cursor:"pointer", fontSize:12, opacity: termLoading ? 0.6 : 1 }}>
                {termLoading ? "Memproses..." : "Konfirmasi Terminasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
