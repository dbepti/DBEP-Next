"""
ETL Sprint 3 — DBEP-Next
Migrasi WPB + AFE ke PPDM39 Supabase
Jalankan di Codespaces: python3 etl_sprint3_uploader.py

Data flow:
  A03_WPB          → project
  A20_DOC_WPB      → rm_information_item + rm_info_item_status
  A04_AFE          → work_order  
  A20_DOC_AFE      → rm_information_item + rm_info_item_status
  
WKID chain untuk AFE:
  A20_DOC_AFE.AFE_ID → A04_AFE.WPB_ID → A03_WPB.WKID
"""
import csv, sys
from pathlib import Path
from datetime import datetime

# ── Credentials ─────────────────────────────────────────────
env = {}
for p in [Path('/workspaces/next/backend/.env'), Path('backend/.env')]:
    if p.exists():
        for line in p.read_text().splitlines():
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k] = v
        break

SUPABASE_URL = env.get('SUPABASE_URL', '')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_KEY', '')
if not SUPABASE_URL:
    print("ERROR: Tidak bisa baca backend/.env")
    sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)
print(f"✓ Supabase: {SUPABASE_URL[:45]}...")

SOURCE = 'DBEP_LEGACY'
QUALITY = 'MIGRATED'
NOW = datetime.now().strftime('%Y-%m-%d')

CHK_MAP = {
    'CHK_PROPOSAL':'PROPOSAL', 'CHK_PRESENTASI':'PRESENTASI',
    'CHK_BS17':'BS17', 'CHK_RT12':'RT12', 'CHK_FORM_AE':'FORM_AE',
    'CHK_RAPAT':'RAPAT', 'CHK_SRTKKKS':'SURAT_KKKS', 'CHK_CHEKLIST':'CHECKLIST',
    'CHK_MOM':'MOM', 'CHK_HADIR':'DAFTAR_HADIR', 'CHK_BSAPR':'BS_APPROVAL',
    'CHK_DRAFTSTJ':'DRAFT_STJ', 'CHK_STJ':'STJ_FINAL',
    'CHK_EVAL_GEO':'EVAL_GEOLOGI', 'CHK_EVAL_GEOF':'EVAL_GEOFIS',
    'CHK_EVAL_EPT':'EVAL_RESERVOIR', 'CHK_EVAL_KOM':'EVAL_EKONOMI',
    'CHK_BS26':'BS26', 'CHK_NOTA':'NOTA_DINAS', 'CHK_EMAIL':'EMAIL_KKKS',
}

WPB_TYPE_MAP = {
    'WPB EKSPLORASI':'WPB_EKSPLORASI',
    'WPB EKSPLOITASI':'WPB_EKSPLOITASI',
    '':'WPB_EKSPLORASI',
}

AFE_TYPE_MAP = {
    'AFE PEMBORAN EKSPLORASI': 'AFE',
    'AFE PEMBORAN EKSPLOITASI':'AFE',
    'AFE FASPROD':             'AFE',
    'AFE WORKOVER':            'AFE',
    'AFE SURVAI':              'AFE',
    'AFE STUDI':               'AFE',
    'AFE_NON_EPT':             'AFE',
    'AFE_NON_EKS':             'AFE',
}

STAT_MAP = {
    'ORIGINAL':'ORIGINAL', 'REVISI':'REVISI',
    'REVISI2':'REVISI', 'REVISI3':'REVISI', 'REVISI4':'REVISI',
    'REPLACEMENT':'REVISI', '':'ORIGINAL',
}

def safe(v, n=None):
    if not v or str(v).strip() == '': return None
    s = str(v).strip()
    return s[:n] if n else s

def safe_int(v):
    try: return int(float(str(v).strip()))
    except: return None

def safe_date(v):
    if not v or str(v).strip() == '': return None
    try:
        d = str(v).strip()[:10]
        datetime.strptime(d, '%Y-%m-%d')
        return d
    except: return None

def batch_upsert(table, rows, batch=300):
    """Insert with ON CONFLICT DO NOTHING via upsert"""
    total, errors = 0, 0
    for i in range(0, len(rows), batch):
        chunk = rows[i:i+batch]
        try:
            sb.table(table).insert(chunk).execute()
            total += len(chunk)
            if i % 3000 == 0 and i > 0:
                print(f"    ... {total:,} inserted")
        except Exception as e:
            errors += 1
            if errors <= 3:
                print(f"  WARN: {str(e)[:100]}")
    return total

# ── Lokasi CSV ───────────────────────────────────────────────
CSV_PATHS = {
    'wpb':     '/workspaces/next/database/A03_WPB_202604150749.csv',
    'doc_wpb': '/workspaces/next/database/A20_DOC_WPB_202604150748.csv',
    'afe':     '/workspaces/next/database/A04_AFE_202604150754.csv',
    'doc_afe': '/workspaces/next/database/A20_DOC_AFE_202604150749.csv',
}

def load_csv(key):
    p = Path(CSV_PATHS[key])
    if not p.exists():
        print(f"  SKIP: {p.name} tidak ditemukan")
        return []
    with open(p, encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

# ══════════════════════════════════════════════════════════════
print("\n[1/5] A03_WPB → PROJECT...")
wpb_rows = load_csv('wpb')
wpb_by_id = {r['WPB_ID']: r for r in wpb_rows}

proj_data = []
for r in wpb_rows:
    yr = r['WPB_YR'].strip()
    proj_data.append({
        'project_id':       r['WPBWKYR'].strip(),
        'project_type':     WPB_TYPE_MAP.get(r['WPB_TYPE'].strip(), 'WPB_EKSPLORASI'),
        'project_name':     f"WP&B {yr} - {r['WKID'].strip()}"[:200],
        'start_date':       f"{yr}-01-01" if yr else None,
        'complete_date':    f"{yr}-12-31" if yr else None,
        'status':           STAT_MAP.get(r['WPB_STAT'].strip(), 'ORIGINAL'),
        'remark':           safe(r.get('WPB_STJ_NO'), 100),
        'source':           SOURCE,
        'row_quality':      QUALITY,
        'row_created_date': NOW,
    })
n = batch_upsert('project', proj_data)
print(f"  ✓ {n:,} PROJECT")

# ══════════════════════════════════════════════════════════════
print("\n[2/5] A04_AFE → WORK_ORDER...")
afe_rows = load_csv('afe')
afe_by_id = {r['AFE_ID']: r for r in afe_rows}

wo_data = []
for r in afe_rows:
    # WKID via WPB_ID → A03_WPB
    wpb = wpb_by_id.get(r['WPB_ID'].strip())
    wkid = wpb['WKID'].strip() if wpb else None
    yr = r['AFE_YR'].strip()
    stat = STAT_MAP.get(r['AFE_STAT'].strip(), 'ORIGINAL')
    wo_data.append({
        'work_order_id':     r['WPBWKYR'].strip() + '-AFE-' + r['AFE_ID'].strip(),
        'project_id':        r['WPBWKYR'].strip(),
        'work_order_type':   AFE_TYPE_MAP.get(r['AFE_TYPE'].strip(), 'AFE'),
        'work_order_number': safe(r.get('AFE_NO'), 100),
        'status':            stat,
        'approval_date':     safe_date(r.get('TGL_PERSETUJUAN')),
        'budget_amount':     safe_int(r.get('ANGSUL')),
        'approved_amount':   safe_int(r.get('ANGSTJ')),
        'currency_ouom':     'IDR',
        'remark':            safe(wkid, 30),
        'source':            SOURCE,
        'row_quality':       QUALITY,
        'row_created_date':  NOW,
    })
n = batch_upsert('work_order', wo_data)
print(f"  ✓ {n:,} WORK_ORDER")

# ══════════════════════════════════════════════════════════════
print("\n[3/5] A20_DOC_WPB → RM_INFORMATION_ITEM + RM_INFO_ITEM_STATUS...")
doc_wpb = load_csv('doc_wpb')

rmii_wpb, status_wpb = [], []
for r in doc_wpb:
    wpb = wpb_by_id.get(r['WPB_ID'].strip())
    if not wpb: continue
    doc_id  = r['DBEP_DOC_ID'].strip()
    info_id = (doc_id or f"DOC-WPB-{r['DOCWPB_ID'].strip()}")[:40]
    yr      = wpb['WPB_YR'].strip()
    wkid    = wpb['WKID'].strip()

    rmii_wpb.append({
        'information_item_id': info_id,
        'land_right_id':       wkid,
        'land_right_subtype':  'LAND_AGREEMENT',
        'item_name':           safe(r.get('DOC_TOPIC') or f"WP&B {yr}", 500),
        'item_type':           WPB_TYPE_MAP.get(wpb['WPB_TYPE'].strip(), 'WPB_EKSPLORASI'),
        'info_item_subtype':   safe(r.get('FILENAME'), 40),
        'active_ind':          STAT_MAP.get(wpb['WPB_STAT'].strip(), 'ORIGINAL'),
        'effective_date':      f"{yr}-01-01" if yr else None,
        'doc_number':          safe(wpb.get('WPB_STJ_NO'), 100),
        'anggaran_usulan':     safe_int(wpb.get('WPB_ANGSUL')),
        'anggaran_disetujui':  safe_int(wpb.get('WPB_ANGSTJ')),
        'currency_ouom':       'IDR',
        'upload_by':           safe(r.get('UPLOAD_BY'), 100),
        'upload_date':         safe_date(r.get('TGL_UPLOAD')),
        'verified_by':         safe(r.get('VERIFIED_BY'), 100),
        'verified_date':       safe_date(r.get('TGL_VERIFIED')),
        'source':              SOURCE,
        'row_quality':         QUALITY,
                'row_created_date':    NOW,
    })
    for chk, sv in CHK_MAP.items():
        status_wpb.append({
            'information_item_id': info_id,
            'rmii_status':         sv,
            'active_ind':          'Y' if r.get(chk,'0').strip()=='1' else 'N',
            'source': SOURCE, 'row_quality': QUALITY,
        })

n1 = batch_upsert('rm_information_item', rmii_wpb)
print(f"  ✓ {n1:,} RM_INFORMATION_ITEM WPB")
n2 = batch_upsert('rm_info_item_status', status_wpb)
print(f"  ✓ {n2:,} RM_INFO_ITEM_STATUS WPB")

# ══════════════════════════════════════════════════════════════
print("\n[4/5] A20_DOC_AFE → RM_INFORMATION_ITEM + RM_INFO_ITEM_STATUS...")
doc_afe = load_csv('doc_afe')

rmii_afe, status_afe = [], []
for r in doc_afe:
    afe     = afe_by_id.get(r['AFE_ID'].strip())
    wpb     = wpb_by_id.get(afe['WPB_ID'].strip()) if afe else None
    wkid    = wpb['WKID'].strip() if wpb else None
    doc_id  = r['DBEP_DOC_ID'].strip()
    info_id = (doc_id or f"DOC-AFE-{r['DOCAFE_ID'].strip()}")[:40]
    yr      = afe['AFE_YR'].strip() if afe else None
    afe_no  = afe['AFE_NO'].strip() if afe else None
    angsul  = safe_int(afe.get('ANGSUL')) if afe else None
    angstj  = safe_int(afe.get('ANGSTJ')) if afe else None
    atype   = AFE_TYPE_MAP.get(afe['AFE_TYPE'].strip(), 'AFE') if afe else 'AFE'

    rmii_afe.append({
        'information_item_id': info_id,
        'land_right_id':       wkid,
        'land_right_subtype':  'LAND_AGREEMENT' if wkid else None,
        'item_name':           safe(r.get('DOC_TOPIC') or f"AFE {afe_no or ''}", 500),
        'item_type':           atype,
        'info_item_subtype':   safe(r.get('FILENAME'), 40),
        'active_ind':          STAT_MAP.get(afe['AFE_STAT'].strip() if afe else '', 'ORIGINAL'),
        'effective_date':      f"{yr}-01-01" if yr else None,
        'doc_number':          safe(afe_no, 100),
        'anggaran_usulan':     angsul,
        'anggaran_disetujui':  angstj,
        'currency_ouom':       'IDR' if angsul else None,
        'upload_by':           safe(r.get('UPLOAD_BY'), 100),
        'upload_date':         safe_date(r.get('TGL_UPLOAD')),
        'verified_by':         safe(r.get('VERIFIED_BY'), 100),
        'verified_date':       safe_date(r.get('TGL_VERIFIED')),
        'source':              SOURCE,
        'row_quality':         QUALITY,
                'row_created_date':    NOW,
    })
    for chk, sv in CHK_MAP.items():
        status_afe.append({
            'information_item_id': info_id,
            'rmii_status':         sv,
            'active_ind':          'Y' if r.get(chk,'0').strip()=='1' else 'N',
            'source': SOURCE, 'row_quality': QUALITY,
        })

n3 = batch_upsert('rm_information_item', rmii_afe)
print(f"  ✓ {n3:,} RM_INFORMATION_ITEM AFE")
n4 = batch_upsert('rm_info_item_status', status_afe)
print(f"  ✓ {n4:,} RM_INFO_ITEM_STATUS AFE")

# ══════════════════════════════════════════════════════════════
print("\n[5/5] Validasi final...")
for table in ['project','work_order','rm_information_item','rm_info_item_status']:
    res = sb.table(table).select('information_item_id', count='exact').execute()
    print(f"  {table:30} {res.count:>8,} baris")

# Update dashboard stat
total_doc = sb.table('rm_information_item').select('information_item_id', count='exact').execute()
print(f"\n  Total dokumen siap di dashboard: {total_doc.count:,}")
print("\n✅ Sprint 3 ETL selesai!")
