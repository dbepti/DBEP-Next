#!/usr/bin/env python3
"""
Patch /dokumen/pod/page.tsx — tambah state filterType + dropdown Tipe
Pattern mengikuti AFE/AFE-Eksploitasi/PMF yang sudah punya filterType.

Perubahan:
1. Tambah state filterType yang init dari searchParams?.get("type")
2. Tambah filterType ke query (WHERE item_type = ...)
3. Tambah filterType ke reset list & useEffect deps
4. Tambah dropdown "Semua Tipe" di toolbar dengan option POD/POP/POFD
5. Tambah filterType ke tombol Reset condition
"""
import os

path = "/workspaces/DBEP-Next/frontend/src/app/dokumen/pod/page.tsx"
with open(path) as f:
    content = f.read()

original = content
notes = []

# --- 1. Tambah state filterType setelah filterStatus -----------------------
old_state = 'const [filterStatus, setFilterStatus] = useState("");'
new_state = ('const [filterStatus, setFilterStatus] = useState("");\n'
             '  const [filterType, setFilterType] = useState(() => searchParams?.get("type") ?? "");')
if 'const [filterType' not in content:
    if old_state in content:
        content = content.replace(old_state, new_state)
        notes.append("state ✓")
    else:
        notes.append("⚠ state anchor tidak ketemu")
else:
    notes.append("state sudah ada")

# --- 2. Tambah filterType ke query -----------------------------------------
old_query = 'if (filterStatus) q = q.eq("doc_status",filterStatus);'
new_query = ('if (filterStatus) q = q.eq("doc_status",filterStatus);\n'
             '    if (filterType) q = q.eq("item_type",filterType);')
if 'q.eq("item_type",filterType)' not in content:
    if old_query in content:
        content = content.replace(old_query, new_query)
        notes.append("query ✓")
    else:
        notes.append("⚠ query anchor tidak ketemu")
else:
    notes.append("query sudah ada")

# --- 3. Tambah filterType ke deps useEffect (load) -------------------------
old_deps1 = '}, [page,filterWK,filterTahun,filterStatus,search]);'
new_deps1 = '}, [page,filterWK,filterTahun,filterStatus,filterType,search]);'
if old_deps1 in content:
    content = content.replace(old_deps1, new_deps1, 1)
    notes.append("load deps ✓")
else:
    notes.append("⚠ load deps tidak ketemu")

# --- 4. Tambah filterType ke deps useEffect (reset page) -------------------
old_deps2 = 'useEffect(()=>{setPage(0);setSelected(null);},[ filterWK,filterTahun,filterStatus,search]);'
new_deps2 = 'useEffect(()=>{setPage(0);setSelected(null);},[ filterWK,filterTahun,filterStatus,filterType,search]);'
if old_deps2 in content:
    content = content.replace(old_deps2, new_deps2, 1)
    notes.append("reset deps ✓")
else:
    # variasi tanpa spasi
    old_deps2b = 'useEffect(()=>{setPage(0);setSelected(null);},[filterWK,filterTahun,filterStatus,search]);'
    new_deps2b = 'useEffect(()=>{setPage(0);setSelected(null);},[filterWK,filterTahun,filterStatus,filterType,search]);'
    if old_deps2b in content:
        content = content.replace(old_deps2b, new_deps2b, 1)
        notes.append("reset deps ✓")
    else:
        notes.append("⚠ reset deps tidak ketemu")

# --- 5. Tambah dropdown Tipe di toolbar (setelah filterStatus select) ------
old_toolbar = '''<select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={ss(!!filterStatus)}>
          <option value="">Semua Status</option>
          {["ORIGINAL","REVISI","REVISI2","DRAFT","FINAL"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>'''
new_toolbar = '''<select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={ss(!!filterStatus)}>
          <option value="">Semua Status</option>
          {["ORIGINAL","REVISI","REVISI2","DRAFT","FINAL"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={ss(!!filterType)}>
          <option value="">Semua Tipe</option>
          <option value="POD">POD</option>
          <option value="POP">POP</option>
          <option value="POFD">POFD</option>
        </select>'''
if 'setFilterType' not in content.split('return (')[1] if 'return (' in content else True:
    if old_toolbar in content:
        content = content.replace(old_toolbar, new_toolbar, 1)
        notes.append("dropdown ✓")
    else:
        notes.append("⚠ toolbar anchor tidak ketemu")

# --- 6. Tambah filterType ke tombol Reset condition ------------------------
old_reset = '{(filterWK||filterTahun||filterStatus||search)&&'
new_reset = '{(filterWK||filterTahun||filterStatus||filterType||search)&&'
if old_reset in content and 'filterType||search' not in content:
    content = content.replace(old_reset, new_reset, 1)
    notes.append("reset cond ✓")

# --- 7. Tambah setFilterType("") ke onClick Reset --------------------------
old_reset_click = 'onClick={()=>{setFilterWK("");setFilterTahun("");setFilterStatus("");setSearch("");}}'
new_reset_click = 'onClick={()=>{setFilterWK("");setFilterTahun("");setFilterStatus("");setFilterType("");setSearch("");}}'
if old_reset_click in content:
    content = content.replace(old_reset_click, new_reset_click, 1)
    notes.append("reset onclick ✓")

if content != original:
    with open(path, "w") as f:
        f.write(content)
    print("✅ pod:", " | ".join(notes))
else:
    print("⚠ pod: tidak ada perubahan —", " | ".join(notes))
