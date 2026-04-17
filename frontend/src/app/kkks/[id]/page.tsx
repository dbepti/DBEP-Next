"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import Link from "next/link";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display:"flex", padding:"8px 0", borderBottom:"1px solid #2a2a2a" }}>
      <div style={{ width:180, fontSize:11, color:"#666", flexShrink:0 }}>{label}</div>
      <div style={{ fontSize:12, color:"#e0e0e0" }}>{value || <span style={{color:"#444"}}>—</span>}</div>
    </div>
  );
}

export default function KKKSDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [kkks, setKkks]   = useState<any>(null);
  const [wkList, setWkList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: k } = await sb.from("BUSINESS_ASSOCIATE")
        .select("*").eq("BUSINESS_ASSOCIATE_ID", id).single();
      setKkks(k);

      // WK yang pernah/sedang dioperasikan
      const { data: ops } = await sb.from("INT_SET_PARTNER")
        .select("INTEREST_SET_ID, ACTIVE_IND, EFFECTIVE_DATE, EXPIRY_DATE")
        .eq("PARTNER_BA_ID", id)
        .eq("INTEREST_SET_ROLE","OPERATOR")
        .order("ACTIVE_IND", { ascending:false });

      if (ops?.length) {
        const wkIds = ops.map((o:any) => o.INTEREST_SET_ID);
        const { data: aliases } = await sb.from("LAND_ALIAS")
          .select("LAND_RIGHT_ID, ALIAS_LONG_NAME")
          .in("LAND_RIGHT_ID", wkIds).eq("LR_ALIAS_ID","WK_NAME");
        const nameMap: Record<string,string> = {};
        (aliases||[]).forEach((a:any) => { nameMap[a.LAND_RIGHT_ID] = a.ALIAS_LONG_NAME; });
        setWkList(ops.map((o:any) => ({
          wkid: o.INTEREST_SET_ID,
          nama: nameMap[o.INTEREST_SET_ID] || o.INTEREST_SET_ID,
          aktif: o.ACTIVE_IND === "Y",
          tgl_efektif: o.EFFECTIVE_DATE,
          tgl_berakhir: o.EXPIRY_DATE,
        })));
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", background:"#212121", color:"#555" }}>Memuat...</div>
  );
  if (!kkks) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", background:"#212121", gap:12 }}>
      <div style={{ fontSize:14, color:"#757575" }}>KKKS '{id}' tidak ditemukan</div>
      <Link href="/kkks" style={{ fontSize:12, color:"#66bb6a" }}>← Kembali</Link>
    </div>
  );

  const aktifCount = wkList.filter(w=>w.aktif).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#212121", overflow:"hidden" }}>
      {/* Topbar */}
      <div style={{ borderBottom:"1px solid #333", padding:"10px 20px", display:"flex", alignItems:"center", gap:8 }}>
        <Link href="/kkks" style={{ color:"#555", fontSize:12, textDecoration:"none" }}>← KKKS</Link>
        <span style={{ color:"#333" }}>/</span>
        <span style={{ fontSize:13, color:"#9e9e9e", fontFamily:"monospace", marginLeft:4 }}>{id}</span>
        <span style={{ fontSize:16, fontWeight:400, color:"#e0e0e0", marginLeft:8, flex:1 }}>{kkks.BA_LONG_NAME}</span>
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:3,
          background: kkks.ACTIVE_IND==="Y" ? "#1b5e2033":"#37373733",
          color: kkks.ACTIVE_IND==="Y" ? "#66bb6a":"#757575",
          border:`1px solid ${kkks.ACTIVE_IND==="Y"?"#66bb6a55":"#55555555"}`,
        }}>{kkks.ACTIVE_IND==="Y" ? "Aktif":"Nonaktif"}</span>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", gap:20 }}>
        {/* Info */}
        <div style={{ flex:1 }}>
          <div style={{ background:"#2c2c2c", border:"1px solid #3a3a3a", borderRadius:8, padding:"16px 18px", marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Data Perusahaan</div>
            <InfoRow label="KSID"          value={<span style={{fontFamily:"monospace",color:"#66bb6a"}}>{kkks.BUSINESS_ASSOCIATE_ID}</span>} />
            <InfoRow label="Nama Lengkap"  value={kkks.BA_LONG_NAME} />
            <InfoRow label="Nama Singkat"  value={kkks.BA_SHORT_NAME} />
            <InfoRow label="Tipe"          value={kkks.BA_TYPE} />
            <InfoRow label="Kategori"      value={kkks.BA_CATEGORY} />
          </div>
        </div>

        {/* WK yang dioperasikan */}
        <div style={{ width:360, flexShrink:0 }}>
          <div style={{ background:"#2c2c2c", border:"1px solid #3a3a3a", borderRadius:8, padding:"16px 18px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
              Wilayah Kerja
              {aktifCount > 0 && <span style={{ marginLeft:8, fontSize:10, color:"#66bb6a" }}>{aktifCount} aktif</span>}
            </div>
            {wkList.length === 0 ? (
              <div style={{ fontSize:12, color:"#444", textAlign:"center", padding:16 }}>Belum ada WK terdaftar</div>
            ) : wkList.map(w => (
              <Link key={w.wkid} href={`/wk/${w.wkid}`} style={{ textDecoration:"none", display:"block" }}>
                <div style={{
                  padding:"9px 12px", borderRadius:6, marginBottom:6,
                  background: w.aktif ? "#1b5e2015":"#2a2a2a",
                  border:`1px solid ${w.aktif ? "#2e7d3255":"#333"}`,
                  cursor:"pointer",
                }}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor=w.aktif?"#2e7d32":"#444")}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor=w.aktif?"#2e7d3255":"#333")}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:11, fontFamily:"monospace", color:"#66bb6a", fontWeight:600 }}>{w.wkid}</span>
                    <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:2,
                      background: w.aktif?"#1b5e20":"#333", color: w.aktif?"#a5d6a7":"#555",
                    }}>{w.aktif?"AKTIF":"EXPIRED"}</span>
                  </div>
                  <div style={{ fontSize:11, color: w.aktif?"#bdbdbd":"#757575", marginTop:3 }}>{w.nama}</div>
                  <div style={{ fontSize:10, color:"#555", marginTop:2 }}>
                    {w.tgl_efektif?.slice(0,7)||"—"} → {w.tgl_berakhir?.slice(0,7)||"sekarang"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
