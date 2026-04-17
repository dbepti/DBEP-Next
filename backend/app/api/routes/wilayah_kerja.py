"""
Wilayah Kerja endpoints — DBEP-Next v2
Semua .maybe_single() diganti .limit(1) + akses via .data[0]
Static routes SEBELUM dynamic {wk_id}
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

from app.core.database import get_supabase

router = APIRouter()


# ── Models ────────────────────────────────────────────────

class WKCreate(BaseModel):
    wkid: str                     = Field(..., min_length=3, max_length=40)
    nama_wk: str                  = Field(..., min_length=2, max_length=255)
    tipe_kontrak: str             = Field(...)
    lokasi: Optional[str]         = None
    fase: Optional[str]           = None
    tgl_ttd: Optional[date]       = None
    tgl_efektif: Optional[date]   = None
    tgl_berakhir: Optional[date]  = None
    luas_km2_ori: Optional[float] = None
    ksid_operator: str            = Field(...)

class WKUpdate(BaseModel):
    nama_wk: Optional[str]        = None
    tipe_kontrak: Optional[str]   = None
    lokasi: Optional[str]         = None
    fase: Optional[str]           = None
    tgl_efektif: Optional[date]   = None
    tgl_berakhir: Optional[date]  = None
    luas_km2_ori: Optional[float] = None

class OperatorGanti(BaseModel):
    ksid_operator_baru: str       = Field(...)
    tgl_mulai: date
    tgl_kontrak_baru: Optional[date] = None
    alasan: Optional[str]         = None

class TerminasiWK(BaseModel):
    tgl_terminasi: date
    alasan: Optional[str]         = None
    nomor_surat: Optional[str]    = None


# ── Helpers ───────────────────────────────────────────────

def _remark(nama, lokasi, fase, status, kelas="CURRENT"):
    return f"WK:{nama}|LOC:{lokasi or 'UNKNOWN'}|STAGE:{fase or ''}|STATUS:{status}|CLASS:{kelas}"

def _edate(d):
    return d.isoformat() if d else None

def _extract(remark: str, key: str) -> str:
    import re
    m = re.search(rf"{key}:([^|]+)", remark or "")
    return m.group(1).strip() if m else ""

def _first(result):
    """Ambil baris pertama dari result Supabase, atau None."""
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None


# ══════════════════════════════════════════════════════════
# STATIC ROUTES — harus sebelum /{wk_id}
# ══════════════════════════════════════════════════════════

@router.get("/stats/ringkasan")
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


@router.get("/utils/kkks-list")
async def kkks_list(search: Optional[str] = Query(None)):
    sb = get_supabase()
    q  = sb.table("BUSINESS_ASSOCIATE").select(
        "BUSINESS_ASSOCIATE_ID, BA_LONG_NAME, BA_SHORT_NAME"
    ).eq("BA_TYPE", "KKKS").eq("ACTIVE_IND", "Y").order("BA_LONG_NAME").limit(200)
    if search:
        q = q.ilike("BA_LONG_NAME", f"%{search}%")
    return q.execute().data


# ══════════════════════════════════════════════════════════
# LIST + CREATE
# ══════════════════════════════════════════════════════════

@router.get("/")
async def list_wk(
    status: Optional[str] = Query(None),
    tipe:   Optional[str] = Query(None),
    lokasi: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit:  int = Query(50, le=500),
    offset: int = Query(0),
):
    sb    = get_supabase()
    query = sb.table("v_wk_lengkap").select("*", count="exact")
    if status: query = query.eq("aktif", status)
    if tipe:   query = query.eq("tipe_kontrak", tipe)
    if lokasi: query = query.eq("lokasi", lokasi)
    if search:
        query = query.or_(
            f"wkid.ilike.%{search}%,nama_wk.ilike.%{search}%,operator_utama.ilike.%{search}%"
        )
    result = query.range(offset, offset + limit - 1).execute()
    return {"data": result.data, "count": result.count}


@router.post("/", status_code=201)
async def create_wk(body: WKCreate):
    sb   = get_supabase()
    wkid = body.wkid.strip().upper()

    # Cek duplikat WKID
    existing = sb.table("LAND_RIGHT").select("LAND_RIGHT_ID")\
                 .eq("LAND_RIGHT_ID", wkid).limit(1).execute()
    if _first(existing):
        raise HTTPException(409, f"WKID '{wkid}' sudah ada")

    # Cek KKKS operator ada
    kkks_res = sb.table("BUSINESS_ASSOCIATE")\
                 .select("BUSINESS_ASSOCIATE_ID, BA_LONG_NAME")\
                 .eq("BUSINESS_ASSOCIATE_ID", body.ksid_operator)\
                 .limit(1).execute()
    kkks = _first(kkks_res)
    if not kkks:
        raise HTTPException(404, f"KKKS '{body.ksid_operator}' tidak ditemukan")

    remark = _remark(body.nama_wk, body.lokasi, body.fase, "ACTIVE")

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
    }).execute()

    # 2. LAND_ALIAS
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

    # 4. INT_SET_COMPONENT
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

    # 5. INT_SET_PARTNER (operator)
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
        "message" : f"WK '{wkid}' berhasil ditambahkan",
        "wkid"    : wkid,
        "operator": kkks["BA_LONG_NAME"],
    }


# ══════════════════════════════════════════════════════════
# DYNAMIC ROUTES — /{wk_id}
# ══════════════════════════════════════════════════════════

@router.get("/{wk_id}")
async def get_wk(wk_id: str):
    sb     = get_supabase()
    wk_res = sb.table("v_wk_lengkap").select("*").eq("wkid", wk_id).limit(1).execute()
    wk     = _first(wk_res)
    if not wk:
        raise HTTPException(404, f"WK '{wk_id}' tidak ditemukan")

    ops = sb.table("INT_SET_PARTNER").select(
        "PARTNER_BA_ID, PARTNER_OBS_NO, ACTIVE_IND, EFFECTIVE_DATE, EXPIRY_DATE"
    ).eq("INTEREST_SET_ID", wk_id).eq("INTEREST_SET_ROLE", "OPERATOR")\
     .order("PARTNER_OBS_NO").execute()

    ba_ids   = [o["PARTNER_BA_ID"] for o in (ops.data or [])]
    ba_names = {}
    if ba_ids:
        ba = sb.table("BUSINESS_ASSOCIATE")\
               .select("BUSINESS_ASSOCIATE_ID, BA_LONG_NAME")\
               .in_("BUSINESS_ASSOCIATE_ID", ba_ids).execute()
        ba_names = {b["BUSINESS_ASSOCIATE_ID"]: b["BA_LONG_NAME"] for b in (ba.data or [])}

    operatorship = [{
        "ksid"        : o["PARTNER_BA_ID"],
        "nama_kkks"   : ba_names.get(o["PARTNER_BA_ID"], o["PARTNER_BA_ID"]),
        "aktif"       : o["ACTIVE_IND"] == "Y",
        "tgl_efektif" : o["EFFECTIVE_DATE"],
        "tgl_berakhir": o["EXPIRY_DATE"],
        "obs_no"      : o["PARTNER_OBS_NO"],
    } for o in (ops.data or [])]

    return {"wk": wk, "operatorship": operatorship}


@router.patch("/{wk_id}")
async def update_wk(wk_id: str, body: WKUpdate):
    sb     = get_supabase()
    wk_res = sb.table("LAND_RIGHT").select("*")\
               .eq("LAND_RIGHT_ID", wk_id)\
               .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT")\
               .limit(1).execute()
    wk = _first(wk_res)
    if not wk:
        raise HTTPException(404, f"WK '{wk_id}' tidak ditemukan")

    lr_update: dict = {"ROW_CHANGED_BY": "DBEP-NEXT"}
    if body.tipe_kontrak is not None: lr_update["GRANTED_RIGHT_TYPE"] = body.tipe_kontrak
    if body.tgl_efektif  is not None: lr_update["EFFECTIVE_DATE"]     = _edate(body.tgl_efektif)
    if body.tgl_berakhir is not None: lr_update["EXPIRY_DATE"]        = _edate(body.tgl_berakhir)
    if body.luas_km2_ori is not None: lr_update["GROSS_SIZE"]         = body.luas_km2_ori

    old_r  = wk.get("REMARK", "")
    nama   = body.nama_wk    or _extract(old_r, "WK")
    lokasi = body.lokasi     or _extract(old_r, "LOC")
    fase   = body.fase       or _extract(old_r, "STAGE")
    status = _extract(old_r, "STATUS") or ("ACTIVE" if wk["ACTIVE_IND"] == "Y" else "TERMINATED")
    lr_update["REMARK"] = _remark(nama, lokasi, fase, status)

    sb.table("LAND_RIGHT").update(lr_update)\
      .eq("LAND_RIGHT_ID", wk_id)\
      .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT").execute()

    if body.nama_wk:
        sb.table("LAND_ALIAS").update({
            "ALIAS_LONG_NAME" : body.nama_wk,
            "ALIAS_SHORT_NAME": body.nama_wk[:30],
        }).eq("LAND_RIGHT_ID", wk_id).eq("LR_ALIAS_ID", "WK_NAME").execute()

    return {"message": f"WK '{wk_id}' berhasil diupdate"}


@router.post("/{wk_id}/ganti-operator")
async def ganti_operator(wk_id: str, body: OperatorGanti):
    sb     = get_supabase()
    wk_res = sb.table("LAND_RIGHT").select("LAND_RIGHT_ID, ACTIVE_IND")\
               .eq("LAND_RIGHT_ID", wk_id)\
               .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT")\
               .limit(1).execute()
    wk = _first(wk_res)
    if not wk:
        raise HTTPException(404, f"WK '{wk_id}' tidak ditemukan")
    if wk["ACTIVE_IND"] != "Y":
        raise HTTPException(400, f"WK '{wk_id}' sudah terminasi")

    kkks_res = sb.table("BUSINESS_ASSOCIATE")\
                 .select("BUSINESS_ASSOCIATE_ID, BA_LONG_NAME")\
                 .eq("BUSINESS_ASSOCIATE_ID", body.ksid_operator_baru)\
                 .limit(1).execute()
    kkks = _first(kkks_res)
    if not kkks:
        raise HTTPException(404, f"KKKS '{body.ksid_operator_baru}' tidak ditemukan")

    sb.table("INT_SET_PARTNER").update({
        "ACTIVE_IND"     : "N",
        "EXPIRY_DATE"    : body.tgl_mulai.isoformat(),
        "REMARK"         : body.alasan or "Pergantian operator",
        "ROW_CHANGED_BY" : "DBEP-NEXT",
    }).eq("INTEREST_SET_ID", wk_id)\
      .eq("INTEREST_SET_ROLE", "OPERATOR")\
      .eq("ACTIVE_IND", "Y").execute()

    existing = sb.table("INT_SET_PARTNER").select("PARTNER_OBS_NO")\
                 .eq("INTEREST_SET_ID", wk_id)\
                 .order("PARTNER_OBS_NO", desc=True).limit(1).execute()
    next_obs = (existing.data[0]["PARTNER_OBS_NO"] + 1) if existing.data else 1

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
        "message"      : f"Operator WK '{wk_id}' berhasil diganti",
        "operator_baru": kkks["BA_LONG_NAME"],
        "berlaku_mulai": body.tgl_mulai.isoformat(),
    }


@router.post("/{wk_id}/terminasi")
async def terminasi_wk(wk_id: str, body: TerminasiWK):
    sb     = get_supabase()
    wk_res = sb.table("LAND_RIGHT").select("LAND_RIGHT_ID, ACTIVE_IND, REMARK")\
               .eq("LAND_RIGHT_ID", wk_id)\
               .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT")\
               .limit(1).execute()
    wk = _first(wk_res)
    if not wk:
        raise HTTPException(404, f"WK '{wk_id}' tidak ditemukan")
    if wk["ACTIVE_IND"] != "Y":
        raise HTTPException(400, f"WK '{wk_id}' sudah terminasi sebelumnya")

    old_r  = wk.get("REMARK", "")
    new_r  = _remark(_extract(old_r,"WK"), _extract(old_r,"LOC"),
                     _extract(old_r,"STAGE"), "TERMINATED")
    if body.nomor_surat:
        new_r += f"|SURAT:{body.nomor_surat}"

    today = date.today().isoformat()
    sb.table("LAND_RIGHT").update({
        "ACTIVE_IND"       : "N",
        "EXPIRY_DATE"      : body.tgl_terminasi.isoformat(),
        "INACTIVATION_DATE": body.tgl_terminasi.isoformat(),
        "REMARK"           : new_r,
        "ROW_CHANGED_BY"   : "DBEP-NEXT",
        "ROW_CHANGED_DATE" : today,
    }).eq("LAND_RIGHT_ID", wk_id)\
      .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT").execute()

    sb.table("INT_SET_PARTNER").update({
        "ACTIVE_IND"     : "N",
        "EXPIRY_DATE"    : body.tgl_terminasi.isoformat(),
        "REMARK"         : f"WK terminasi: {body.alasan or '-'}",
        "ROW_CHANGED_BY" : "DBEP-NEXT",
    }).eq("INTEREST_SET_ID", wk_id).eq("ACTIVE_IND", "Y").execute()

    sb.table("INTEREST_SET").update({
        "ACTIVE_IND"     : "N",
        "EXPIRY_DATE"    : body.tgl_terminasi.isoformat(),
        "ROW_CHANGED_BY" : "DBEP-NEXT",
    }).eq("INTEREST_SET_ID", wk_id).eq("ACTIVE_IND", "Y").execute()

    return {
        "message"       : f"WK '{wk_id}' berhasil diterminasi",
        "tgl_terminasi" : body.tgl_terminasi.isoformat(),
    }


@router.delete("/{wk_id}")
async def delete_wk(wk_id: str):
    sb     = get_supabase()
    wk_res = sb.table("LAND_RIGHT").select("LAND_RIGHT_ID, ACTIVE_IND")\
               .eq("LAND_RIGHT_ID", wk_id)\
               .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT")\
               .limit(1).execute()
    wk = _first(wk_res)
    if not wk:
        raise HTTPException(404, f"WK '{wk_id}' tidak ditemukan")
    if wk["ACTIVE_IND"] == "Y":
        raise HTTPException(400, f"WK '{wk_id}' masih AKTIF — terminasi dulu")

    sb.table("INT_SET_PARTNER").delete().eq("INTEREST_SET_ID", wk_id).execute()
    sb.table("INT_SET_COMPONENT").delete().eq("INTEREST_SET_ID", wk_id).execute()
    sb.table("INTEREST_SET").delete().eq("INTEREST_SET_ID", wk_id).execute()
    sb.table("LAND_ALIAS").delete().eq("LAND_RIGHT_ID", wk_id).execute()
    sb.table("LAND_RIGHT").delete()\
      .eq("LAND_RIGHT_ID", wk_id)\
      .eq("LAND_RIGHT_SUBTYPE", "LAND_AGREEMENT").execute()

    return {"message": f"WK '{wk_id}' berhasil dihapus permanen", "wkid": wk_id}
