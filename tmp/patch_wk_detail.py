#!/usr/bin/env python3
"""
Patch /wk/[id]/page.tsx — kartu Dokumen Terkait:
1. Link `Lihat →` tambah ?type={item_type} selain ?wkid
2. Sort kartu sesuai urutan logis: WPB → AFE umum → AFE sub → POD → PMF → Resources → Cadangan
"""
import os, re

path = "/workspaces/DBEP-Next/frontend/src/app/wk/[id]/page.tsx"
with open(path) as f:
    content = f.read()

# === Patch 1: link — tambah &type=${tipe} ================================
old_link = '<a href={`/dokumen/${route}?wkid=${id}`} style={{ fontSize:10, color:"#42a5f5", textDecoration:"none" }}>Lihat →</a>'
new_link = '<a href={`/dokumen/${route}?wkid=${id}&type=${tipe}`} style={{ fontSize:10, color:"#42a5f5", textDecoration:"none" }}>Lihat →</a>'

if old_link in content:
    content = content.replace(old_link, new_link)
    print("✅ Link Lihat → sekarang menyertakan ?wkid + &type")
else:
    print("❌ Pattern link lama tidak ketemu — cek manual")

# === Patch 2: sorting — override default sort by count dengan urutan tetap =
# Cari bagian `.sort((a,b)=>(b[1] as any[]).length-(a[1] as any[]).length)`
# Ganti dengan custom sort berdasarkan urutan ORDER tertentu.

old_sort = '.sort((a,b)=>(b[1] as any[]).length-(a[1] as any[]).length)'
new_sort = '''.sort((a,b)=>{
                    const ORDER: Record<string,number> = {
                      WPB_EKSPLORASI:1, AFE_PEMBORAN_EKS:2, AFE_STUDI:3, AFE_SURVAI:4,
                      WPB_EKSPLOITASI:5, AFE_PEMBORAN_EPT:6, AFE_FASPROD:7, AFE_WORKOVER:8, AFE_NON_EPT:9,
                      POD:10, POP:11, POFD:12, PMF:13, EOR:14,
                      RESOURCES_PL:15, CADANGAN:16,
                    };
                    return (ORDER[a[0]]??99) - (ORDER[b[0]]??99);
                  })'''

if old_sort in content:
    content = content.replace(old_sort, new_sort)
    print("✅ Sort kartu diubah ke urutan logis")
else:
    print("⚠ Pattern sort lama tidak ketemu (mungkin sudah di-patch)")

with open(path, "w") as f:
    f.write(content)

print("Done.")
