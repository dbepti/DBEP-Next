#!/usr/bin/env python3
"""
Patch /wk/[id]/page.tsx:
1. Tambah state `dokumen` + fetch dari v_dokumen di useEffect yang ada
2. Sisipkan section "Dokumen Terkait" dengan kartu hierarkis (pola B)
3. Sisipan posisi: sebelum baris `{/* Modal Terminasi */}`
"""
import os

path = "/workspaces/DBEP-Next/frontend/src/app/wk/[id]/page.tsx"
with open(path) as f:
    content = f.read()

# ===== STEP 1: Tambah state dokumen ==================================
old_state = 'const [termMsg, setTermMsg]         = useState("");'
new_state = (
    'const [termMsg, setTermMsg]         = useState("");\n'
    '  const [dokumen, setDokumen] = useState<any[]>([]);'
)
if old_state in content and 'setDokumen' not in content:
    content = content.replace(old_state, new_state)
    print("✅ State dokumen ditambahkan")
elif 'setDokumen' in content:
    print("⚠ State dokumen sudah ada")
else:
    print("❌ Anchor state tidak ketemu")
    exit(1)

# ===== STEP 2: Tambah fetch dokumen di useEffect =====================
# Sisipkan sebelum `setLoading(false)` yang pertama muncul di useEffect utama
# Anchor: cari `setWk(wkData ?? null);` yang unique
anchor = 'setWk(wkData ?? null);'
fetch_code = (
    anchor + '\n'
    '\n'
    '      // Fetch dokumen terkait WK ini\n'
    '      const { data: docData } = await sb.from("v_dokumen")\n'
    '        .select("information_item_id,item_type,item_name,effective_date,doc_status")\n'
    '        .eq("wkid", id);\n'
    '      setDokumen(docData ?? []);'
)
if anchor in content and 'v_dokumen' not in content:
    content = content.replace(anchor, fetch_code, 1)
    print("✅ Fetch dokumen ditambahkan di useEffect")
elif 'v_dokumen' in content:
    print("⚠ Fetch dokumen sudah ada")
else:
    print("❌ Anchor useEffect tidak ketemu")
    exit(1)

# ===== STEP 3: Sisipkan section Dokumen Terkait ======================
# Anchor: `{/* Modal Terminasi */}`
modal_anchor = '{/* Modal Terminasi */}'

section_jsx = r'''{/* Section Dokumen Terkait */}
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

      '''

if modal_anchor in content and 'Section Dokumen Terkait' not in content:
    content = content.replace(modal_anchor, section_jsx + modal_anchor, 1)
    print("✅ Section Dokumen Terkait disisipkan sebelum Modal Terminasi")
elif 'Section Dokumen Terkait' in content:
    print("⚠ Section sudah ada")
else:
    print("❌ Anchor Modal Terminasi tidak ketemu")
    exit(1)

with open(path, "w") as f:
    f.write(content)

# Verifikasi line count
lines = content.count("\n") + 1
print(f"\n✅ Done. File sekarang {lines} baris.")
