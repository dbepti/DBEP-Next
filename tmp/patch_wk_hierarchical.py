#!/usr/bin/env python3
"""
Patch /wk/[id]/page.tsx — rewrite section Dokumen Terkait dengan pola B:
- Kartu induk untuk grup dengan subtype (AFE Eksplorasi, AFE Eksploitasi, POD, PMF)
- Subtype ditampilkan sebagai rows di dalam kartu induk dengan link kecil
- Kartu tunggal (WPB, Resources, Cadangan) tetap polos seperti sebelumnya
"""
import os, re

path = "/workspaces/DBEP-Next/frontend/src/app/wk/[id]/page.tsx"
with open(path) as f:
    content = f.read()

# ==== Target: ganti blok .map(([tipe, items]... sampai akhir })} ==========
# Saya ganti seluruh mapping block dengan versi hierarkis.

# Marker awal: Object.entries(dokumen.reduce(...))
# Marker akhir: })} sebelum </div> penutup grid

# Saya cari dari `.sort((a,b)=>{` (sort yang tadi di-patch) sampai `})}\n`
# paling dekat setelahnya yang berada di kolom indentasi yang sama.

# Lebih robust: cari full block `Object.entries(...)....map((...) => { ... })`
# sampai balancing tutupnya. Pakai regex yang match seluruh .reduce(...).sort(...).map(...)

# Saya gunakan pattern literal kalau ada di file, jadi lihat 2 markers:
old_block_start = '{Object.entries('
old_block_end_marker = '                  })}'  # indentasi 18 spasi

start_idx = content.find(old_block_start)
if start_idx == -1:
    print("❌ Marker awal 'Object.entries(' tidak ketemu")
    exit(1)

# Cari closing `})}` yang match level indentasi mapping utama
end_idx = content.find(old_block_end_marker, start_idx)
if end_idx == -1:
    print("❌ Marker akhir '})}' tidak ketemu pada indentasi yang cocok")
    exit(1)
end_idx += len(old_block_end_marker)

old_block = content[start_idx:end_idx]
print(f"Block lama: {len(old_block)} chars, {old_block.count(chr(10))+1} baris")

# ==== Block baru =========================================================
new_block = r"""(() => {
                    // Grupkan dokumen per tipe
                    const byType: Record<string, any[]> = dokumen.reduce((acc:any, d:any) => {
                      const t = d.item_type ?? "LAINNYA";
                      (acc[t] ??= []).push(d);
                      return acc;
                    }, {});

                    // Struktur grup — tipe induk + subtype
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

                    // Hitung total per grup
                    const countGrp = (g:Grp) => g.subs
                      ? g.subs.reduce((s,x)=>s+(byType[x.type]?.length??0),0)
                      : (byType[g.key]?.length??0);

                    // Tampilkan hanya grup yang punya minimal 1 dokumen
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
                      // kartu tunggal (tanpa subs)
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
                  })()"""

content_new = content[:start_idx] + new_block + content[end_idx:]

with open(path, "w") as f:
    f.write(content_new)

print(f"✅ Block Dokumen Terkait berhasil di-rewrite ({len(new_block)} chars)")
print("   Grup hierarkis: AFE Eksplorasi, AFE Eksploitasi, POD/POP/POFD, PMF/EOR")
print("   Kartu tunggal: WPB Eksplorasi, WPB Eksploitasi, Resources, Cadangan")
