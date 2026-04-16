"""
Wilayah Kerja endpoints — DBEP-Next
PPDM39: LAND_RIGHT + LAND_ALIAS + INTEREST_SET + INT_SET_PARTNER + INT_SET_COMPONENT
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

from app.core.database import get_supabase

router = APIRouter()


# ── Pydantic Models ───────────────────────────────────────

class WKCreate(BaseModel):
    wkid: str                       = Field(..., min_length=3, max_length=40)
    nama_wk: str                    = Field(..., min_length=2, max_length=255)
    tipe_kontrak: str               = Field(..., description="PSC/PTM/PSC-EXT/JOB/JOA/COW/KONTRAK JASA")
    lokasi: Optional[str]           = Field(None, description="ONSHORE/OFFSHORE/ONSHORE/OFFSHORE")
    fase: Optional[str]             = Field(None, description="EXPLORATION/PRODUCTION/DEVELOPMENT")
    tgl_ttd: Optional[date]         = None
    tgl_efektif: Optional[date]     = None
    tgl_berakhir: Optional[date]    = None
    luas_km2_ori: Optional[float]   = None
    ksid_operator: str              = Field(..., description="KSID dari BUSINESS_ASSOCIATE")

class WKUpdate(BaseModel):
    nama_wk: Optional[str]          = None
    tipe_kontrak: Optional[str]     = None
    lokasi: Optional[str]           = None
    fase: Optional[str]             = None
    tgl_efektif: Optional[date]     = None
    tgl_berakhir: Optional[date]    = None
    luas_km2_ori: Optional[float]   = None

class OperatorGanti(BaseModel):
    ksid_operator_baru: str         = Field(..., description="KSID KKKS operator baru")
    tgl_mulai: date                 = Field(..., description="Tanggal mulai operator baru")
    tgl_kontrak_baru: Optional[date]= None
    alasan: Optional[str]           = None

class TerminasiWK(BaseModel):
    tgl_terminasi: date
    alasan: Optional[str]           = None
    nomor_surat: Optional[str]      = None


# ── Helpers ───────────────────────────────────────────────

def _remark(nama: str, lokasi: str, fase: str, status: str, kelas: str = "CURRENT") -> str:
    return f"WK:{nama}|LOC:{lokasi or 'UNKNOWN'}|STAGE:{fase or ''}|STATUS:{status}|CLASS:{kelas}"

def _edate(d: Optional[date]) -> Optional[str]:
    return d.isoformat() if d else None


# ── GET: Daftar WK ────────────────────────────────────────

@router.get("/", summary="Daftar semua Wilayah Kerja")
async def list_wk(
    status:  Optional[str] = Query(None, description="Y=Aktif, N=Terminasi"),
    tipe:    Optional[str] = Query(None),
    lokasi:  Optional[str] = Query(None),
    search:  Optional[str] = Query(None),
    limit:   int           = Query(50,  le=500),
    offset:  int           = Query(0),
):
    sb    = get_supabase()
    query = sb.table("v_wk_lengkap").select("*", count="exact")

    if status: query = query.eq("aktif", status)
    if tipe:   query = query.eq("tipe_kontrak", tipe)
    if lokasi: query = query.eq("lokasi", lokasi)
    if search:
        query = query.or_(
            f"wkid.ilike.%{search}%,"
            f"nama_wk.ilike.%{search}%,"
            f"operator_utama.ilike.%{search}%"
        )

    query  = query.range(offset, offset + limit - 1)
    result = query.execute()
    return {"data": result.data, "count": result.count, "limit": limit, "offset": offset}


# ── GET: Detail satu WK ───────────────────────────────────

@router.get("/{wk_id}", summary="Detail Wilayah Kerja")
async def get_wk(wk_id: str):
    sb = get_supabase()

    # Main data dari view
    wk = sb.table("v_wk_lengkap").select("*").eq("wkid", wk_id).maybe_single().execute()
    if not wk.data:
        raise HTTPException(404, f"WK '{wk_id}' tidak ditemukan")

    # Riwayat operator (semua, aktif dan expired)
    ops = sb.table("INT_SET_PARTNER").select(
        "PARTNER_BA_ID, PARTNER_OBS_NO, ACTIVE_IND, INTEREST_SET_ROLE,"
        "EFFECTIVE_DATE, EXPIRY_DATE, SOURCE"
    ).eq("INTEREST_SET_ID", wk_id).eq("INTEREST_SET_ROLE", "OPERATOR")\
     .order("PARTNER_OBS_NO").execute()

    # Nama KKKS untuk tiap operator
    ba_ids = [o["PARTNER_BA_ID"] for o in (ops.data or [])]
    ba_names = {}
    if ba_ids:
        ba_res = sb.table("BUSINESS_ASSOCIATE").select(
            "BUSINESS_ASSOCIATE_ID, BA_LONG_NAME, BA_SHORT_NAME"
        ).in_("BUSINESS_ASSOCIATE_ID", ba_ids).execute()
        ba_names = {b["BUSINESS_ASSOCIATE_ID"]: b["BA_LONG_NAME"] for b in (ba_res.data or [])}

    operatorship = []
    for o in (ops.data or []):
        operatorship.append({
            "ksid"       : o["PARTNER_BA_ID"],
            "nama_kkks"  : ba_names.get(o["PARTNER_BA_ID"], o["PARTNER_BA_ID"]),
            "aktif"      : o["ACTIVE_IND"] == "Y",
            "tgl_efektif": o["EFFECTIVE_DATE"],
            "tgl_berakhir": o["EXPIRY_DATE"],
            "obs_no"     : o["PARTNER_OBS_NO"],
        })

    return {"wk": wk.data, "operatorship": operatorship}


# ── POST: Tambah WK baru ──────────────────────────────────

@router.post("/", status_code=201, summary="Tambah Wilayah Kerja baru")
async def create_wk(body: WKCreate):
    sb   = get_supabase()
    wkid = body.wkid.strip().upper()

    # Cek duplikat
    existing = sb.table("LAND_RIGHT").select("LAND_RIGHT_ID")\
                 .eq("LAND_RIGHT_ID", wkid).maybe_single().execute()
    if existing.data:
        raise HTTPException(409, f"WKID '{wkid}' sudah ada")

    # Cek KKKS operator ada
    kkks = sb.table("BUSINESS_ASSOCIATE").select("BUSINESS_ASSOCIATE_ID, BA_LONG_NAME")\
              .eq("BUSINESS_ASSOCIATE_ID", body.ksid_operator).maybe_single().execute()
    if not kkks.data:
        raise HTTPException(404, f"KKKS '{body.ksid_operator}' tidak ditemukan di BUSINESS_ASSOCIATE")

    remark = _remark(body.nama_wk, body.lokasi or "", body.fase or "", "ACTIVE")

    # 1. LAND_RIGHT
    sb.table("LAND_RIGHT").insert({
        "LAND_RIGHT_SUBTYPE" : "LAND_AGREEMENT",
        "LAND_RIGHT_ID"      : wkid,
        "ACTIVE_IND"         : "Y",
        "GRANTED_RIGHT_TYPE" : body.tipe_kontrak,
        "ACQTN_DATE"         : _edate(body.tgl_ttd),
        "EFFECTIVE_DATE"     : _edate(body.tgl_efektif),
        "EXPIRY_DATE"        : _edate(body.tgl_berakhir),
        "GROSS_SIZE"         : body.luas_km2_ori,
        "GROSS_SIZE_OUOM"    : "KM2" if body.luas_km2_ori else None,
        "REMARK"             : remark,
        "SOURCE"             : "DBEP",
        "ROW_CREATED_BY"     : "DBEP-NEXT",
        "ROW_CREATED_DATE"   : date.today().isoformat(),
    }).execute()

    # 2. LAND_ALIAS (nama WK)
    sb.table("LAND_ALIAS").insert({
        "LAND_RIGHT_SUBTYPE" : "LAND_AGREEMENT",
        "LAND_RIGHT_ID"      : wkid,
        "LR_ALIAS_ID"        : "WK_NAME",
        "ACTIVE_IND"         : "Y",
        "ALIAS_LONG_NAME"    : body.nama_wk,
        "ALIAS_SHORT_NAME"   : body.nama_wk[:30],
        "PREFERRED_IND"      : "Y",
        "SOURCE"             : "DBEP",
    }).execute()

    # 3. INTEREST_SET
    sb.table("INTEREST_SET").insert({
        "INTEREST_SET_ID"     : wkid,
        "INTEREST_SET_SEQ_NO" : 1,
        "ACTIVE_IND"          : "Y",
        "INTEREST_SET_TYPE"   : "WORKING",
        "EFFECTIVE_DATE"      : _edate(body.tgl_efektif),
        "EXPIRY_DATE"         : _edate(body.tgl_berakhir),
        "SOURCE"              : "DBEP",
    }).execute()

    # 4. INT_SET_COMPONENT (link ke LAND_RIGHT)
    sb.table("INT_SET_COMPONENT").insert({
        "INTEREST_SET_ID"     : wkid,
        "INTEREST_SET_SEQ_NO" : 1,
        "COMPONENT_OBS_NO"    : 1,
        "ACTIVE_IND"          : "Y",
        "COMPONENT_TYPE"      : "LAND_RIGHT",
        "LAND_RIGHT_SUBTYPE"  : "LAND_AGREEMENT",
        "LAND_RIGHT_ID"       : wkid,
        "SOURCE"              : "DBEP",
    }).execute()

    # 5. INT_SET_PARTNER (operator pertama)
    sb.table("INT_SET_PARTNER").insert({
        "INTEREST_SET_ID"     : wkid,
        "INTEREST_SET_SEQ_NO" : 1,
        "PARTNER_BA_ID"       : body.ksid_operator,
        "PARTNER_OBS_NO"      : 1,
        "ACTIVE_IND"          : "Y",
        "INTEREST_SET_ROLE"   : "OPERATOR",
        "EFFECTIVE_DATE"      : _edate(body.tgl_efektif),
        "EXPIRY_DATE"         : _edate(body.tgl_berakhir),
        "BREACH_IND"          : "N",
        "PENALTY_IND"         : "N",
        "SOURCE"              : "DBEP",
    }).execute()

    return {
        "message"   : f"WK '{wkid}' berhasil ditambahkan",
        "wkid"      : wkid,
        "operator"  : kkks.data["BA_LONG_NAME"],
    }


# ── PATCH: Update data WK ─────────────────────────────────

@router.patch("/{wk_id}", summary="Update data Wilayah Kerja")
async def update_wk(wk_id: str, body: WKUpdate):
    sb = get_supabase()

    # Cek WK ada
    wk = sb.table("LAND_RIGHT").select("*")\
           .eq("LAND_RIGHT_ID", wk_id)\
           .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT")\
           .maybe_single().execute()
    if not wk.data:
        raise HTTPException(404, f"WK '{wk_id}' tidak ditemukan")

    # Update LAND_RIGHT
    lr_update: dict = {"ROW_CHANGED_BY": "DBEP-NEXT", "ROW_CHANGED_DATE": date.today().isoformat()}
    if body.tipe_kontrak  is not None: lr_update["GRANTED_RIGHT_TYPE"] = body.tipe_kontrak
    if body.tgl_efektif   is not None: lr_update["EFFECTIVE_DATE"]     = _edate(body.tgl_efektif)
    if body.tgl_berakhir  is not None: lr_update["EXPIRY_DATE"]        = _edate(body.tgl_berakhir)
    if body.luas_km2_ori  is not None: lr_update["GROSS_SIZE"]         = body.luas_km2_ori

    # Update REMARK jika ada perubahan nama/lokasi/fase
    old_remark = wk.data.get("REMARK", "")
    nama   = body.nama_wk or _extract(old_remark, "WK")
    lokasi = body.lokasi  or _extract(old_remark, "LOC")
    fase   = body.fase    or _extract(old_remark, "STAGE")
    status = _extract(old_remark, "STATUS") or ("ACTIVE" if wk.data["ACTIVE_IND"] == "Y" else "TERMINATED")
    lr_update["REMARK"] = _remark(nama, lokasi, fase, status)

    sb.table("LAND_RIGHT").update(lr_update)\
      .eq("LAND_RIGHT_ID", wk_id)\
      .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT").execute()

    # Update LAND_ALIAS jika nama berubah
    if body.nama_wk:
        sb.table("LAND_ALIAS").update({
            "ALIAS_LONG_NAME"  : body.nama_wk,
            "ALIAS_SHORT_NAME" : body.nama_wk[:30],
        }).eq("LAND_RIGHT_ID", wk_id).eq("LR_ALIAS_ID", "WK_NAME").execute()

    return {"message": f"WK '{wk_id}' berhasil diupdate"}


def _extract(remark: str, key: str) -> str:
    """Ambil nilai dari format WK:...|LOC:...|STAGE:..."""
    import re
    m = re.search(rf"{key}:([^|]+)", remark)
    return m.group(1).strip() if m else ""


# ── POST: Ganti operator ──────────────────────────────────

@router.post("/{wk_id}/ganti-operator", summary="Ganti KKKS Operator WK")
async def ganti_operator(wk_id: str, body: OperatorGanti):
    sb = get_supabase()

    # Cek WK ada dan aktif
    wk = sb.table("LAND_RIGHT").select("LAND_RIGHT_ID, ACTIVE_IND")\
           .eq("LAND_RIGHT_ID", wk_id).eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT")\
           .maybe_single().execute()
    if not wk.data:
        raise HTTPException(404, f"WK '{wk_id}' tidak ditemukan")
    if wk.data["ACTIVE_IND"] != "Y":
        raise HTTPException(400, f"WK '{wk_id}' sudah terminasi — tidak bisa ganti operator")

    # Cek KKKS baru ada
    kkks = sb.table("BUSINESS_ASSOCIATE").select("BUSINESS_ASSOCIATE_ID, BA_LONG_NAME")\
              .eq("BUSINESS_ASSOCIATE_ID", body.ksid_operator_baru).maybe_single().execute()
    if not kkks.data:
        raise HTTPException(404, f"KKKS '{body.ksid_operator_baru}' tidak ditemukan")

    # Nonaktifkan semua operator lama
    sb.table("INT_SET_PARTNER").update({
        "ACTIVE_IND"         : "N",
        "EXPIRY_DATE"        : body.tgl_mulai.isoformat(),
        "REMARK"             : body.alasan or "Pergantian operator",
        "ROW_CHANGED_BY"     : "DBEP-NEXT",
        "ROW_CHANGED_DATE"   : date.today().isoformat(),
    }).eq("INTEREST_SET_ID", wk_id)\
      .eq("INTEREST_SET_ROLE", "OPERATOR")\
      .eq("ACTIVE_IND", "Y").execute()

    # Cari obs_no tertinggi yang ada
    existing = sb.table("INT_SET_PARTNER").select("PARTNER_OBS_NO")\
                 .eq("INTEREST_SET_ID", wk_id)\
                 .order("PARTNER_OBS_NO", desc=True).limit(1).execute()
    next_obs = (existing.data[0]["PARTNER_OBS_NO"] + 1) if existing.data else 1

    # Insert operator baru
    sb.table("INT_SET_PARTNER").insert({
        "INTEREST_SET_ID"     : wk_id,
        "INTEREST_SET_SEQ_NO" : 1,
        "PARTNER_BA_ID"       : body.ksid_operator_baru,
        "PARTNER_OBS_NO"      : next_obs,
        "ACTIVE_IND"          : "Y",
        "INTEREST_SET_ROLE"   : "OPERATOR",
        "EFFECTIVE_DATE"      : body.tgl_mulai.isoformat(),
        "EXPIRY_DATE"         : _edate(body.tgl_kontrak_baru),
        "BREACH_IND"          : "N",
        "PENALTY_IND"         : "N",
        "REMARK"              : body.alasan,
        "SOURCE"              : "DBEP",
    }).execute()

    return {
        "message"         : f"Operator WK '{wk_id}' berhasil diganti",
        "operator_baru"   : kkks.data["BA_LONG_NAME"],
        "berlaku_mulai"   : body.tgl_mulai.isoformat(),
    }


# ── POST: Terminasi WK ────────────────────────────────────

@router.post("/{wk_id}/terminasi", summary="Terminasi Wilayah Kerja")
async def terminasi_wk(wk_id: str, body: TerminasiWK):
    sb = get_supabase()

    wk = sb.table("LAND_RIGHT").select("LAND_RIGHT_ID, ACTIVE_IND")\
           .eq("LAND_RIGHT_ID", wk_id).eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT")\
           .maybe_single().execute()
    if not wk.data:
        raise HTTPException(404, f"WK '{wk_id}' tidak ditemukan")
    if wk.data["ACTIVE_IND"] != "Y":
        raise HTTPException(400, f"WK '{wk_id}' sudah terminasi sebelumnya")

    today = date.today().isoformat()

    # 1. Update LAND_RIGHT
    old_remark = sb.table("LAND_RIGHT").select("REMARK")\
                   .eq("LAND_RIGHT_ID", wk_id).maybe_single().execute()
    old_r = old_remark.data.get("REMARK","") if old_remark.data else ""
    new_remark = old_r.replace("|STATUS:ACTIVE", "|STATUS:TERMINATED")\
                      .replace("|STATUS:TERMINATING", "|STATUS:TERMINATED")
    if "STATUS:" not in new_remark:
        new_remark += "|STATUS:TERMINATED"
    if body.nomor_surat:
        new_remark += f"|SURAT:{body.nomor_surat}"

    sb.table("LAND_RIGHT").update({
        "ACTIVE_IND"         : "N",
        "EXPIRY_DATE"        : body.tgl_terminasi.isoformat(),
        "INACTIVATION_DATE"  : body.tgl_terminasi.isoformat(),
        "REMARK"             : new_remark,
        "ROW_CHANGED_BY"     : "DBEP-NEXT",
        "ROW_CHANGED_DATE"   : today,
    }).eq("LAND_RIGHT_ID", wk_id)\
      .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT").execute()

    # 2. Nonaktifkan semua operator
    sb.table("INT_SET_PARTNER").update({
        "ACTIVE_IND"      : "N",
        "EXPIRY_DATE"     : body.tgl_terminasi.isoformat(),
        "REMARK"          : f"WK terminasi: {body.alasan or '-'}",
        "ROW_CHANGED_BY"  : "DBEP-NEXT",
        "ROW_CHANGED_DATE": today,
    }).eq("INTEREST_SET_ID", wk_id).eq("ACTIVE_IND", "Y").execute()

    # 3. Nonaktifkan INTEREST_SET
    sb.table("INTEREST_SET").update({
        "ACTIVE_IND"      : "N",
        "EXPIRY_DATE"     : body.tgl_terminasi.isoformat(),
        "ROW_CHANGED_BY"  : "DBEP-NEXT",
        "ROW_CHANGED_DATE": today,
    }).eq("INTEREST_SET_ID", wk_id).eq("ACTIVE_IND", "Y").execute()

    return {
        "message"          : f"WK '{wk_id}' berhasil diterminasi",
        "tgl_terminasi"    : body.tgl_terminasi.isoformat(),
        "checklist_url"    : f"/wk/{wk_id}/checklist-serah-terima",
    }


# ── GET: Stats ────────────────────────────────────────────

@router.get("/stats/ringkasan", summary="Statistik ringkasan WK")
async def stats_wk():
    sb    = get_supabase()
    total = sb.table("LAND_RIGHT").select("*", count="exact").head(True)\
              .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT").execute()
    aktif = sb.table("LAND_RIGHT").select("*", count="exact").head(True)\
              .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT").eq("ACTIVE_IND", "Y").execute()
    return {
        "total_wk"    : total.count or 0,
        "wk_aktif"    : aktif.count or 0,
        "wk_terminasi": (total.count or 0) - (aktif.count or 0),
    }


# ── GET: KKKS list (untuk dropdown form) ─────────────────

@router.get("/utils/kkks-list", summary="Daftar KKKS untuk dropdown")
async def kkks_list(search: Optional[str] = Query(None)):
    sb = get_supabase()
    q  = sb.table("BUSINESS_ASSOCIATE").select(
        "BUSINESS_ASSOCIATE_ID, BA_LONG_NAME, BA_SHORT_NAME, BA_TYPE"
    ).eq("BA_TYPE", "KKKS").eq("ACTIVE_IND", "Y").order("BA_LONG_NAME").limit(200)
    if search:
        q = q.ilike("BA_LONG_NAME", f"%{search}%")
    result = q.execute()
    return result.data
