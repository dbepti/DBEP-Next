"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const inputStyle: React.CSSProperties = {
  width:"100%", background:"#1a1a1a", border:"1px solid #383838",
  borderRadius:4, padding:"7px 10px", color:"#e0e0e0", fontSize:12,
  outline:"none", boxSizing:"border-box",
};

function Field({ label, required, hint, children }: { label:string; required?:boolean; hint?:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:11, color:"#757575", marginBottom:5 }}>
        {label}{required && <span style={{ color:"#ef9a9a" }}> *</span>}
        {hint && <span style={{ color:"#444", marginLeft:6 }}>({hint})</span>}
      </label>
      {children}
    </div>
  );
}

export default function KKKSBaruPage() {
  const router  = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  const [ksid, setKsid]         = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [namaSingkat, setNamaSingkat] = useState("");
  const [holding, setHolding]   = useState("");
  const [alamat, setAlamat]     = useState("");
  const [telp, setTelp]         = useState("");
  const [email, setEmail]       = useState("");

  // Auto-suggest KSID
  useEffect(() => {
    sb.from("BUSINESS_ASSOCIATE")
      .select("BUSINESS_ASSOCIATE_ID")
      .like("BUSINESS_ASSOCIATE_ID","KS%")
      .order("BUSINESS_ASSOCIATE_ID", { ascending:false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          const last = data[0].BUSINESS_ASSOCIATE_ID as string;
          const num  = parseInt(last.replace(/[^0-9]/g,"")) || 0;
          setKsid(`KS${num + 1}`);
        } else {
          setKsid("KS1001");
        }
      });
  }, []);

  // Auto-fill singkatan dari nama lengkap
  useEffect(() => {
    if (namaLengkap && !namaSingkat) {
      setNamaSingkat(namaLengkap.slice(0, 30));
    }
  }, [namaLengkap]);

  async function handleSubmit() {
    if (!ksid.trim())       { setMsg("❌ KSID wajib diisi"); return; }
    if (!namaLengkap.trim()){ setMsg("❌ Nama lengkap wajib diisi"); return; }

    setSaving(true); setMsg("");
    try {
      // Cek duplikat KSID
      const { data: existing } = await sb.from("BUSINESS_ASSOCIATE")
        .select("BUSINESS_ASSOCIATE_ID")
        .eq("BUSINESS_ASSOCIATE_ID", ksid.trim())
        .maybeSingle();
      if (existing) throw new Error(`KSID '${ksid}' sudah digunakan`);

      // Insert BUSINESS_ASSOCIATE
      const { error } = await sb.from("BUSINESS_ASSOCIATE").insert({
        BUSINESS_ASSOCIATE_ID : ksid.trim(),
        BA_LONG_NAME          : namaLengkap.trim(),
        BA_SHORT_NAME         : (namaSingkat || namaLengkap).slice(0, 30).trim(),
        BA_TYPE               : "KKKS",
        BA_CATEGORY           : "COMPANY",
        ACTIVE_IND            : "Y",
        SOURCE                : "DBEP",
        ROW_CREATED_BY        : "DBEP-NEXT",
      });
      if (error) throw new Error(error.message);

      setMsg(`✅ KKKS '${namaLengkap.trim()}' berhasil ditambahkan`);
      setTimeout(() => router.push(`/kkks/${ksid.trim()}`), 1200);
    } catch(e: any) {
      setMsg("❌ " + e.message);
    } finally { setSaving(false); }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#212121", overflow:"hidden" }}>
      {/* Topbar */}
      <div style={{ borderBottom:"1px solid #333", padding:"10px 20px", display:"flex", alignItems:"center", gap:8 }}>
        <Link href="/kkks" style={{ color:"#555", fontSize:12, textDecoration:"none" }}>← KKKS</Link>
        <span style={{ color:"#333" }}>/</span>
        <span style={{ fontSize:16, fontWeight:400, color:"#e0e0e0", marginLeft:4 }}>Tambah KKKS Baru</span>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:24 }}>
        <div style={{ maxWidth:560 }}>

          <div style={{ fontSize:11, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>Identitas KKKS</div>

          <div style={{ display:"grid", gridTemplateColumns:"140px 1fr", gap:12 }}>
            <Field label="KSID" required hint="auto-generate">
              <input value={ksid} onChange={e=>setKsid(e.target.value.toUpperCase())}
                style={{ ...inputStyle, fontFamily:"monospace", color:"#66bb6a" }} />
            </Field>
            <Field label="Nama Lengkap KKKS" required>
              <input value={namaLengkap} onChange={e=>setNamaLengkap(e.target.value)}
                placeholder="contoh: PT. AMERIANTI OFFSHORE ENERGY" style={inputStyle} />
            </Field>
          </div>

          <Field label="Nama Singkat / Sebutan" hint="maks 30 karakter">
            <input value={namaSingkat} onChange={e=>setNamaSingkat(e.target.value.slice(0,30))}
              placeholder="contoh: AMERIANTI" style={inputStyle} />
          </Field>

          <Field label="Perusahaan Induk (Holding)">
            <input value={holding} onChange={e=>setHolding(e.target.value)}
              placeholder="contoh: CHEVRON PACIFIC CORPORATION" style={inputStyle} />
          </Field>

          <div style={{ fontSize:11, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14, marginTop:8 }}>Kontak</div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Nomor Telepon">
              <input value={telp} onChange={e=>setTelp(e.target.value)}
                placeholder="021-xxx" style={inputStyle} />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="info@kkks.co.id" style={inputStyle} />
            </Field>
          </div>

          <Field label="Alamat">
            <textarea value={alamat} onChange={e=>setAlamat(e.target.value)} rows={2}
              placeholder="Jl. ..." style={{ ...inputStyle, resize:"none" }} />
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
            }}>{saving ? "Menyimpan..." : "Simpan KKKS Baru"}</button>
            <Link href="/kkks" style={{
              padding:"8px 16px", borderRadius:4, background:"transparent",
              border:"1px solid #383838", color:"#757575", fontSize:13, textDecoration:"none",
            }}>Batal</Link>
          </div>

        </div>
      </div>
    </div>
  );
}
