#!/usr/bin/env python3
"""
Patch 8 halaman dokumen supaya auto-filter WK dari query param ?wkid=...
- Tambah import useSearchParams
- Inisialisasi filterWK dari URL saat mount
"""
import os, re

PAGES = [
    "wpb-eksplorasi", "wpb-eksploitasi", "afe", "afe-eksploitasi",
    "pod", "pmf", "resources", "cadangan",
]
BASE = "/workspaces/DBEP-Next/frontend/src/app/dokumen"

# Pattern 1: tambah useSearchParams di import react (kalau belum)
IMPORT_OLD = 'import { useEffect, useState, useCallback } from "react";'
IMPORT_NEW = ('import { useEffect, useState, useCallback } from "react";\n'
              'import { useSearchParams } from "next/navigation";')

# Pattern 2: deklarasi state filterWK default ""
#   Tiap page bisa punya variasi, kita cari `const [filterWK, setFilterWK] = useState(` dst
#   lalu ganti `useState("")` → `useState(() => searchParams?.get("wkid") ?? "")`
STATE_PATTERNS = [
    ('const [filterWK, setFilterWK] = useState("");',
     'const [filterWK, setFilterWK] = useState(() => searchParams?.get("wkid") ?? "");'),
    ('const [filterWK,setFilterWK] = useState("");',
     'const [filterWK,setFilterWK] = useState(() => searchParams?.get("wkid") ?? "");'),
    ('const [filterWK, setFilterWK] = useState<string>("");',
     'const [filterWK, setFilterWK] = useState<string>(() => searchParams?.get("wkid") ?? "");'),
]

# Pattern 3: tambah `const searchParams = useSearchParams();` di awal body component
#   Cari `export default function <Name>() {` lalu sisipkan di baris setelahnya
DEF_RE = re.compile(r'(export default function \w+\(\)\s*\{\s*\n)')
SEARCH_PARAMS_LINE = '  const searchParams = useSearchParams();\n'


def patch_file(path: str) -> tuple[bool, str]:
    if not os.path.exists(path):
        return False, "file tidak ada"
    with open(path) as f:
        content = f.read()

    orig = content
    notes = []

    # 1. Import
    if 'useSearchParams' not in content:
        if IMPORT_OLD in content:
            content = content.replace(IMPORT_OLD, IMPORT_NEW)
            notes.append("import ✓")
        else:
            notes.append("⚠ import pattern tidak match")
    else:
        notes.append("import sudah ada")

    # 2. Sisipkan `const searchParams = useSearchParams();`
    if 'useSearchParams()' not in content:
        m = DEF_RE.search(content)
        if m:
            content = content[:m.end()] + SEARCH_PARAMS_LINE + content[m.end():]
            notes.append("hook ✓")
        else:
            notes.append("⚠ function def tidak ketemu")
    else:
        notes.append("hook sudah ada")

    # 3. State init
    replaced_state = False
    for old, new in STATE_PATTERNS:
        if old in content:
            content = content.replace(old, new)
            replaced_state = True
            notes.append("state ✓")
            break
    if not replaced_state:
        notes.append("⚠ state pattern tidak match")

    if content == orig:
        return False, " | ".join(notes)

    with open(path, "w") as f:
        f.write(content)
    return True, " | ".join(notes)


if __name__ == "__main__":
    for p in PAGES:
        path = f"{BASE}/{p}/page.tsx"
        ok, notes = patch_file(path)
        mark = "✅" if ok else "⚠️"
        print(f"{mark} {p:20s} — {notes}")
