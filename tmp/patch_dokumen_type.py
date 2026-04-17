#!/usr/bin/env python3
"""
Patch halaman dokumen yang punya filterType:
  afe, afe-eksploitasi, pod, pmf
Inisialisasi filterType dari query param ?type=...
"""
import os

PAGES = ["afe", "afe-eksploitasi", "pod", "pmf"]
BASE = "/workspaces/DBEP-Next/frontend/src/app/dokumen"

# Cari state filterType yang sudah di-init dengan "", ganti agar baca dari URL
OLD_VARIANTS = [
    'const [filterType, setFilterType] = useState("");',
    'const [filterType,setFilterType] = useState("");',
]
NEW = 'const [filterType, setFilterType] = useState(() => searchParams?.get("type") ?? "");'

for p in PAGES:
    path = f"{BASE}/{p}/page.tsx"
    if not os.path.exists(path):
        print(f"❌ {p}: file tidak ada"); continue

    with open(path) as f:
        content = f.read()

    replaced = False
    for old in OLD_VARIANTS:
        if old in content:
            content = content.replace(old, NEW)
            replaced = True
            break

    if replaced:
        with open(path, "w") as f:
            f.write(content)
        print(f"✅ {p}: filterType sekarang init dari ?type=")
    else:
        # Coba lihat baris yang berisi filterType init
        for i, line in enumerate(content.split("\n"), 1):
            if "filterType" in line and "useState" in line:
                print(f"   {p} baris {i}: {line.strip()[:120]}")
                break
        print(f"⚠ {p}: pattern tidak match — kemungkinan sudah di-patch atau format berbeda")
