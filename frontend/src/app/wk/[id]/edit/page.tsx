"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const sb  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const API = "/api/proxy";  // Next.js proxy → FastAPI localhost:8000

const TIPE_LIST   = ["PSC","PSC-EXT","PTM","PTM-1","PTM-2","PTM-3","JOB","JOA","COW","KONTRAK JASA"];
const LOKASI_LIST = ["ONSHORE","OFFSHORE","ONSHORE/OFFSHORE"];
const FASE_LIST   = ["EXPLORATION","EXPLORATION GMB","PRODUCTION","DEVELOPMENT","NON ACTIVE"];

function Field({ label, required, children }: { label:string; required?:boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:11, color:"#757575", marginBottom:5 }}>
        {label}{required && <span style={{ color:"#ef9a9a" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width:"100%", background:"#1a1a1a", border:"1px solid #383838",
  borderRadius:4, padding:"7px 10px", color:"#e0e0e0", fontSize:12,
  outline:"none", boxSizing:"border-box",
};
const selectStyle: React.CSSProperties = { ...inputStyle };

export default function WKEditPage() {
  const { id }       = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const initTab      = searchParams.get("tab") === "operator" ? "operator" : "info";

  const [tab, setTab]     = useState<"info"|"operator">(initTab as any);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");

  // Form: info WK
  const [namaWk, setNamaWk]         = useState("");
  const [tipeKontrak, setTipeKontrak] = useState("");
  const [lokasi, setLokasi]           = useState("");
  const [fase, setFase]               = useState("");
  const [tglEfektif, setTglEfektif]   = useState("");
  const [tglBerakhir, setTglBerakhir] = useState("");
  const [luasKm2, setLuasKm2]         = useState("");

  // Form: ganti operator
  const [kkksSearch, setKkksSearch]   = useState("");
  const [kksOptions, setKksOptions]   = useState<any[]>([]);
  const [kkksSelected, setKkksSelected] = useState<{id:string;nama:string}|null>(null);
  const [tglMulai, setTglMulai]       = useState("");
  const [alasan, setAlasan]           = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await sb.from("v_wk_lengkap").select("*").eq("wkid", id).single();
      if (data) {
        setNamaWk(data.nama_wk || "");
        setTipeKontrak(data.tipe_kontrak || "");
        setLokasi(data.lokasi || "");
        setFase(data.fase || "");
        setTglEfektif(data.tgl_efektif?.slice(0,10) || "");
        setTglBerakhir(data.tgl_berakhir?.slice(0,10) || "");
        setLuasKm2(data.luas_km2?.toString() || "");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Search KKKS
  useEffect(() => {
    if (kkksSearch.length < 2) { setKksOptions([]); return; }
    const t = setTimeout(async () => {
      const { data } = await sb.from("BUSINESS_ASSOCIATE")
        .select("BUSINESS_ASSOCIATE_ID,BA_LONG_NAME")
        .eq("BA_TYPE","KKKS").eq("ACTIVE_IND","Y")
        .ilike("BA_LONG_NAME", `%${kkksSearch}%`).limit(10);
      setKksOptions(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [kkksSearch]);

  async function saveInfo() {
    setSaving(true); setMsg("");
    try {
      const remark = `WK:${namaWk}|LOC:${lokasi}|STAGE:${fase}|STATUS:ACTIVE|CLASS:CURRENT`;
      const { error: e1 } = await sb.from("LAND_RIGHT").update({
        GRANTED_RIGHT_TYPE : tipeKontrak,
        EFFECTIVE_DATE     : tglEfektif || null,
        EXPIRY_DATE        : tglBerakhir || null,
        GROSS_SIZE         : luasKm2 ? parseFloat(luasKm2) : null,
        REMARK             : remark,
        ROW_CHANGED_BY     : "DBEP-NEXT",
      }).eq("LAND_RIGHT_ID", id).eq("LAND_RIGHT_SUBTYPE","LAND_AGREEMENT");
      if (e1) throw new Error(e1.message);

      const { error: e2 } = await sb.from("LAND_ALIAS").update({
        ALIAS_LONG_NAME  : namaWk,
        ALIAS_SHORT_NAME : namaWk.slice(0,30),
      }).eq("LAND_RIGHT_ID", id).eq("LR_ALIAS_ID","WK_NAME");
      if (e2) throw new Error(e2.message);

      setMsg("✅ Data WK berhasil diupdate");
      setTimeout(() => router.push(`/wk/${id}`), 1200);
    } catch(e:any) { setMsg("❌ " + e.message); }
    finally { setSaving(false); }
  }

  async function gantiOperator() {
    if (!kkksSelected) { setMsg("❌ Pilih KKKS operator baru dari daftar"); return; }
    if (!tglMulai)     { setMsg("❌ Tanggal mulai wajib diisi"); return; }
    setSaving(true); setMsg("");
    try {
      // Nonaktifkan operator lama
      const { error: e1 } = await sb.from("INT_SET_PARTNER").update({
        ACTIVE_IND       : "N",
        EXPIRY_DATE      : tglMulai,
        REMARK           : alasan || "Pergantian operator",
        ROW_CHANGED_BY   : "DBEP-NEXT",
      }).eq("INTEREST_SET_ID", id).eq("INTEREST_SET_ROLE","OPERATOR").eq("ACTIVE_IND","Y");
      if (e1) throw new Error(e1.message);

      // Cari obs_no tertinggi
      const { data: existing } = await sb.from("INT_SET_PARTNER")
        .select("PARTNER_OBS_NO").eq("INTEREST_SET_ID", id)
        .order("PARTNER_OBS_NO", { ascending:false }).limit(1);
      const nextObs = existing?.[0] ? existing[0].PARTNER_OBS_NO + 1 : 1;

      // Insert operator baru
      const { error: e2 } = await sb.from("INT_SET_PARTNER").insert({
        INTEREST_SET_ID     : id,
        INTEREST_SET_SEQ_NO : 1,
        PARTNER_BA_ID       : kkksSelected.id,
        PARTNER_OBS_NO      : nextObs,
        ACTIVE_IND          : "Y",
        INTEREST_SET_ROLE   : "OPERATOR",
        EFFECTIVE_DATE      : tglMulai,
        BREACH_IND          : "N",
        PENALTY_IND         : "N",
        REMARK              : alasan || null,
        SOURCE              : "DBEP",
      });
      if (e2) throw new Error(e2.message);

      setMsg("✅ Operator berhasil diganti");
      setTimeout(() => router.push(`/wk/${id}`), 1200);
    } catch(e:any) { setMsg("❌ " + e.message); }
    finally { setSaving(false); }
  }

  const tabStyle = (t: string): React.CSSProperties => ({
    padding:"8px 16px", fontSize:12, cursor:"pointer", border:"none",
    borderBottom: tab===t ? "2px solid #66bb6a" : "2px solid transparent",
    background:"transparent", color: tab===t ? "#66bb6a" : "#757575",
  });

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", background:"#212121", color:"#555" }}>Memuat...</div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#212121", overflow:"hidden" }}>
      {/* Topbar */}
      <div style={{ borderBottom:"1px solid #333", padding:"10px 20px", display:"flex", alignItems:"center", gap:8 }}>
        <Link href={`/wk/${id}`} style={{ color:"#555", fontSize:12, textDecoration:"none" }}>← Detail {id}</Link>
        <span style={{ color:"#333" }}>/</span>
        <span style={{ fontSize:16, fontWeight:400, color:"#e0e0e0", marginLeft:4, flex:1 }}>Edit Wilayah Kerja</span>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom:"1px solid #2a2a2a", display:"flex", paddingLeft:20 }}>
        <button style={tabStyle("info")}     onClick={() => setTab("info")}>Informasi WK</button>
        <button style={tabStyle("operator")} onClick={() => setTab("operator")}>Ganti Operator</button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", padding:24 }}>
        <div style={{ maxWidth:540 }}>

          {/* ── Tab: Info WK ── */}
          {tab === "info" && (
            <>
              <Field label="Nama Wilayah Kerja" required>
                <input value={namaWk} onChange={e=>setNamaWk(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Tipe Kontrak" required>
                <select value={tipeKontrak} onChange={e=>setTipeKontrak(e.target.value)} style={selectStyle}>
                  <option value="">-- Pilih --</option>
                  {TIPE_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Lokasi">
                  <select value={lokasi} onChange={e=>setLokasi(e.target.value)} style={selectStyle}>
                    <option value="">-- Pilih --</option>
                    {LOKASI_LIST.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Fase">
                  <select value={fase} onChange={e=>setFase(e.target.value)} style={selectStyle}>
                    <option value="">-- Pilih --</option>
                    {FASE_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Tanggal Efektif">
                  <input type="date" value={tglEfektif} onChange={e=>setTglEfektif(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Tanggal Berakhir">
                  <input type="date" value={tglBerakhir} onChange={e=>setTglBerakhir(e.target.value)} style={inputStyle} />
                </Field>
              </div>
              <Field label="Luas Asal (km²)">
                <input type="number" value={luasKm2} onChange={e=>setLuasKm2(e.target.value)} placeholder="contoh: 5826" style={inputStyle} />
              </Field>

              {msg && <div style={{ fontSize:12, color: msg.startsWith("✅") ? "#66bb6a":"#ef9a9a", margin:"12px 0" }}>{msg}</div>}
              <div style={{ display:"flex", gap:10, marginTop:8 }}>
                <button onClick={saveInfo} disabled={saving} style={{ padding:"8px 24px", borderRadius:4, background:"#1b5e20", border:"1px solid #2e7d32", color:"#a5d6a7", cursor:"pointer", fontSize:13, opacity: saving?0.6:1 }}>
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
                <Link href={`/wk/${id}`} style={{ padding:"8px 16px", borderRadius:4, background:"transparent", border:"1px solid #383838", color:"#757575", fontSize:13, textDecoration:"none" }}>Batal</Link>
              </div>
            </>
          )}

          {/* ── Tab: Ganti Operator ── */}
          {tab === "operator" && (
            <>
              <div style={{ background:"#1a2a1a", border:"1px solid #2e7d3244", borderRadius:6, padding:"10px 14px", marginBottom:20, fontSize:12, color:"#81c784" }}>
                ℹ Operator lama akan dinonaktifkan. Riwayat tetap tersimpan di sistem.
              </div>
              <Field label="Cari KKKS Operator Baru" required>
                <input
                  value={kkksSearch}
                  onChange={e => { setKkksSearch(e.target.value); setKkksSelected(null); }}
                  placeholder="Ketik nama KKKS..."
                  style={inputStyle}
                />
                {kksOptions.length > 0 && !kkksSelected && (
                  <div style={{ background:"#1a1a1a", border:"1px solid #383838", borderRadius:4, marginTop:2, maxHeight:200, overflowY:"auto" }}>
                    {kksOptions.map((k:any) => (
                      <div key={k.BUSINESS_ASSOCIATE_ID}
                        onClick={() => { setKkksSelected({id: k.BUSINESS_ASSOCIATE_ID, nama: k.BA_LONG_NAME}); setKkksSearch(k.BA_LONG_NAME); setKksOptions([]); }}
                        style={{ padding:"8px 12px", fontSize:12, color:"#bdbdbd", cursor:"pointer", borderBottom:"1px solid #2a2a2a" }}
                        onMouseEnter={e=>(e.currentTarget.style.background="#2a2a2a")}
                        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                      >
                        <span style={{ fontSize:10, color:"#555", fontFamily:"monospace", marginRight:8 }}>{k.BUSINESS_ASSOCIATE_ID}</span>
                        {k.BA_LONG_NAME}
                      </div>
                    ))}
                  </div>
                )}
                {kkksSelected && (
                  <div style={{ marginTop:6, padding:"6px 10px", background:"#1b5e2020", border:"1px solid #2e7d3244", borderRadius:4, fontSize:11, color:"#81c784" }}>
                    ✓ {kkksSelected.nama}
                    <span style={{ fontSize:10, color:"#555", marginLeft:8 }}>{kkksSelected.id}</span>
                  </div>
                )}
              </Field>
              <Field label="Tanggal Mulai Berlaku" required>
                <input type="date" value={tglMulai} onChange={e=>setTglMulai(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Alasan Pergantian">
                <textarea value={alasan} onChange={e=>setAlasan(e.target.value)} rows={3}
                  placeholder="Contoh: Akuisisi oleh KKKS baru, perubahan kepemilikan saham, dll."
                  style={{ ...inputStyle, resize:"none" }} />
              </Field>

              {msg && <div style={{ fontSize:12, color: msg.startsWith("✅")?"#66bb6a":"#ef9a9a", margin:"12px 0" }}>{msg}</div>}
              <div style={{ display:"flex", gap:10, marginTop:8 }}>
                <button onClick={gantiOperator} disabled={saving} style={{ padding:"8px 24px", borderRadius:4, background:"#1b5e20", border:"1px solid #2e7d32", color:"#a5d6a7", cursor:"pointer", fontSize:13, opacity: saving?0.6:1 }}>
                  {saving ? "Memproses..." : "Konfirmasi Ganti Operator"}
                </button>
                <Link href={`/wk/${id}`} style={{ padding:"8px 16px", borderRadius:4, background:"transparent", border:"1px solid #383838", color:"#757575", fontSize:13, textDecoration:"none" }}>Batal</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
