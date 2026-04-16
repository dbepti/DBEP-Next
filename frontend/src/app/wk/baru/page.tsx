"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";

const sb  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TIPE_LIST   = ["PSC","PSC-EXT","PTM","PTM-1","PTM-2","PTM-3","JOB","JOA","COW","KONTRAK JASA"];
const LOKASI_LIST = ["ONSHORE","OFFSHORE","ONSHORE/OFFSHORE"];
const FASE_LIST   = ["EXPLORATION","EXPLORATION GMB","PRODUCTION","DEVELOPMENT"];

function Field({ label, required, hint, children }: { label:string; required?:boolean; hint?:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:11, color:"#757575", marginBottom:5 }}>
        {label}{required && <span style={{ color:"#ef9a9a" }}> *</span>}
        {hint && <span style={{ color:"#444", marginLeft:6, fontWeight:400 }}>({hint})</span>}
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

export default function WKBaruPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  // Form fields
  const [wkid, setWkid]               = useState("");
  const [namaWk, setNamaWk]           = useState("");
  const [tipeKontrak, setTipeKontrak] = useState("PSC");
  const [lokasi, setLokasi]           = useState("ONSHORE");
  const [fase, setFase]               = useState("EXPLORATION");
  const [tglTtd, setTglTtd]           = useState("");
  const [tglEfektif, setTglEfektif]   = useState("");
  const [tglBerakhir, setTglBerakhir] = useState("");
  const [luasKm2, setLuasKm2]         = useState("");

  // KKKS operator
  const [kkksSearch, setKkksSearch]     = useState("");
  const [kkksOptions, setKkksOptions]   = useState<any[]>([]);
  const [kkksSelected, setKkksSelected] = useState<{id:string;nama:string}|null>(null);

  // WKID auto-suggest: ambil ID terakhir
  useEffect(() => {
    sb.from("LAND_RIGHT").select("LAND_RIGHT_ID")
      .eq("LAND_RIGHT_SUBTYPE","LAND_AGREEMENT")
      .order("LAND_RIGHT_ID", { ascending:false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          const lastId  = data[0].LAND_RIGHT_ID as string;
          const lastNum = parseInt(lastId.replace(/[^0-9]/g,"")) || 0;
          const prefix  = lastId.replace(/[0-9]+$/,"");
          setWkid(`${prefix}${String(lastNum + 1).padStart(4,"0")}`);
        }
      });
  }, []);

  // Search KKKS
  useEffect(() => {
    if (kkksSearch.length < 2) { setKkksOptions([]); return; }
    const t = setTimeout(async () => {
      const { data } = await sb.from("BUSINESS_ASSOCIATE")
        .select("BUSINESS_ASSOCIATE_ID,BA_LONG_NAME")
        .eq("BA_TYPE","KKKS").eq("ACTIVE_IND","Y")
        .ilike("BA_LONG_NAME",`%${kkksSearch}%`).limit(10);
      setKkksOptions(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [kkksSearch]);

  async function handleSubmit() {
    if (!wkid.trim())    { setMsg("❌ WKID wajib diisi"); return; }
    if (!namaWk.trim())  { setMsg("❌ Nama WK wajib diisi"); return; }
    if (!kkksSelected)   { setMsg("❌ Operator KKKS wajib dipilih"); return; }

    setSaving(true); setMsg("");
    try {
      const res = await fetch(`${API}/api/wk`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          wkid: wkid.trim().toUpperCase(),
          nama_wk: namaWk.trim(),
          tipe_kontrak: tipeKontrak,
          lokasi, fase,
          tgl_ttd: tglTtd || null,
          tgl_efektif: tglEfektif || null,
          tgl_berakhir: tglBerakhir || null,
          luas_km2_ori: luasKm2 ? parseFloat(luasKm2) : null,
          ksid_operator: kkksSelected.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal menyimpan");
      setMsg("✅ " + data.message);
      setTimeout(() => router.push(`/wk/${wkid.trim().toUpperCase()}`), 1200);
    } catch(e:any) { setMsg("❌ " + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#212121", overflow:"hidden" }}>
      {/* Topbar */}
      <div style={{ borderBottom:"1px solid #333", padding:"10px 20px", display:"flex", alignItems:"center", gap:8 }}>
        <Link href="/wk" style={{ color:"#555", fontSize:12, textDecoration:"none" }}>← Wilayah Kerja</Link>
        <span style={{ color:"#333" }}>/</span>
        <span style={{ fontSize:16, fontWeight:400, color:"#e0e0e0", marginLeft:4 }}>Tambah WK Baru</span>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:24 }}>
        <div style={{ maxWidth:600 }}>

          {/* Identitas WK */}
          <div style={{ fontSize:11, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>Identitas Wilayah Kerja</div>

          <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:12, marginBottom:0 }}>
            <Field label="WKID" required hint="auto-generate">
              <input value={wkid} onChange={e=>setWkid(e.target.value.toUpperCase())}
                placeholder="contoh: WK1500"
                style={{ ...inputStyle, fontFamily:"monospace", color:"#66bb6a" }} />
            </Field>
            <Field label="Nama Wilayah Kerja" required>
              <input value={namaWk} onChange={e=>setNamaWk(e.target.value)} placeholder="contoh: MAHAKAM" style={inputStyle} />
            </Field>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <Field label="Tipe Kontrak" required>
              <select value={tipeKontrak} onChange={e=>setTipeKontrak(e.target.value)} style={{ ...inputStyle }}>
                {TIPE_LIST.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Lokasi">
              <select value={lokasi} onChange={e=>setLokasi(e.target.value)} style={{ ...inputStyle }}>
                {LOKASI_LIST.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Fase Awal">
              <select value={fase} onChange={e=>setFase(e.target.value)} style={{ ...inputStyle }}>
                {FASE_LIST.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>

          {/* Tanggal */}
          <div style={{ fontSize:11, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14, marginTop:8 }}>Tanggal Kontrak</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <Field label="Tgl Ditandatangani">
              <input type="date" value={tglTtd} onChange={e=>setTglTtd(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Tgl Efektif">
              <input type="date" value={tglEfektif} onChange={e=>setTglEfektif(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Tgl Berakhir">
              <input type="date" value={tglBerakhir} onChange={e=>setTglBerakhir(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Luas Awal (km²)">
            <input type="number" value={luasKm2} onChange={e=>setLuasKm2(e.target.value)} placeholder="contoh: 5826" style={{ ...inputStyle, maxWidth:200 }} />
          </Field>

          {/* Operator */}
          <div style={{ fontSize:11, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14, marginTop:8 }}>KKKS Operator</div>
          <Field label="Pilih KKKS Operator" required>
            <input
              value={kkksSearch}
              onChange={e => { setKkksSearch(e.target.value); setKkksSelected(null); }}
              placeholder="Ketik nama KKKS..."
              style={inputStyle}
            />
            {kkksOptions.length > 0 && !kkksSelected && (
              <div style={{ background:"#1a1a1a", border:"1px solid #383838", borderRadius:4, marginTop:2, maxHeight:200, overflowY:"auto", position:"relative", zIndex:10 }}>
                {kkksOptions.map((k:any) => (
                  <div key={k.BUSINESS_ASSOCIATE_ID}
                    onClick={() => { setKkksSelected({id:k.BUSINESS_ASSOCIATE_ID,nama:k.BA_LONG_NAME}); setKkksSearch(k.BA_LONG_NAME); setKkksOptions([]); }}
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
                <button onClick={() => { setKkksSelected(null); setKkksSearch(""); }}
                  style={{ marginLeft:8, background:"transparent", border:"none", color:"#555", cursor:"pointer", fontSize:11 }}>✕</button>
              </div>
            )}
          </Field>

          {msg && (
            <div style={{ padding:"10px 14px", borderRadius:6, marginBottom:16,
              background: msg.startsWith("✅") ? "#1b5e2020" : "#b71c1c20",
              border: `1px solid ${msg.startsWith("✅") ? "#2e7d3244" : "#c6282844"}`,
              fontSize:12, color: msg.startsWith("✅") ? "#81c784" : "#ef9a9a",
            }}>{msg}</div>
          )}

          <div style={{ display:"flex", gap:10, paddingTop:8, borderTop:"1px solid #2a2a2a" }}>
            <button onClick={handleSubmit} disabled={saving} style={{
              padding:"8px 28px", borderRadius:4, background:"#1b5e20",
              border:"1px solid #2e7d32", color:"#a5d6a7", cursor:"pointer",
              fontSize:13, fontWeight:500, opacity: saving ? 0.6 : 1,
            }}>{saving ? "Menyimpan..." : "Simpan WK Baru"}</button>
            <Link href="/wk" style={{
              padding:"8px 16px", borderRadius:4, background:"transparent",
              border:"1px solid #383838", color:"#757575", fontSize:13, textDecoration:"none",
            }}>Batal</Link>
          </div>

        </div>
      </div>
    </div>
  );
}
