"""
Wilayah Kerja endpoints
PPDM39: LAND_RIGHT + LAND_ALIAS + INT_SET_COMPONENT
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from app.core.database import get_supabase

router = APIRouter()


class WilayahKerja(BaseModel):
    land_right_id: str          # WKID
    nama_wk: str                # dari LAND_ALIAS
    land_right_subtype: str     # ONSHORE / OFFSHORE / ONSHORE_OFFSHORE
    granted_right_type: str     # PSC / TAC / JOB
    land_right_category: str    # WK_ACTIVE / WK_TERMINATED dst
    acqtn_date: Optional[date]  # WKCTRTTD
    effective_date: Optional[date]
    expiry_date: Optional[date]
    gross_size: Optional[float] # km2
    jurisdiction: str
    source: str
    row_quality: str


class WKSummary(BaseModel):
    land_right_id: str
    nama_wk: str
    granted_right_type: str
    land_right_category: str
    operator: Optional[str]
    jumlah_dokumen: int = 0


@router.get("/", response_model=List[WKSummary], summary="Daftar semua Wilayah Kerja")
async def list_wk(
    status: Optional[str] = Query(None, description="WK_ACTIVE / WK_TERMINATED"),
    tipe: Optional[str] = Query(None, description="PSC / TAC / JOB"),
    limit: int = Query(100, le=500),
    offset: int = 0,
):
    """
    Ambil daftar Wilayah Kerja dari LAND_RIGHT.
    Setara dengan 'Semua Wilayah Kerja' di DBEP lama.
    """
    sb = get_supabase()
    query = sb.table("land_right").select(
        "land_right_id, land_right_category, granted_right_type, gross_size"
    )
    if status:
        query = query.eq("land_right_category", status)
    if tipe:
        query = query.eq("granted_right_type", tipe)

    result = query.range(offset, offset + limit - 1).execute()
    return result.data


@router.get("/{wk_id}", response_model=WilayahKerja, summary="Detail Wilayah Kerja")
async def get_wk(wk_id: str):
    """Detail satu WK termasuk nama alias dan info kontrak."""
    sb = get_supabase()
    result = sb.table("land_right").select("*").eq("land_right_id", wk_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"WK '{wk_id}' tidak ditemukan")
    return result.data


@router.get("/{wk_id}/dokumen", summary="Dokumen milik WK ini")
async def get_wk_dokumen(
    wk_id: str,
    doc_type: Optional[str] = Query(None, description="WPB / AFE / POD / CADANGAN"),
    tahun: Optional[int] = None,
):
    """
    Semua dokumen yang terkait ke WK ini.
    PPDM39: LAND_RIGHT_COMPONENT → RM_INFORMATION_ITEM
    """
    sb = get_supabase()
    query = (
        sb.table("rm_information_item")
        .select("information_item_id, item_name, item_type, effective_date, source, row_quality")
        .eq("land_right_id", wk_id)
    )
    if doc_type:
        query = query.eq("item_type", doc_type)
    if tahun:
        query = query.gte("effective_date", f"{tahun}-01-01").lte("effective_date", f"{tahun}-12-31")

    result = query.execute()
    return {"wk_id": wk_id, "count": len(result.data), "dokumen": result.data}


@router.get("/{wk_id}/operatorship", summary="Riwayat operator WK")
async def get_wk_operatorship(wk_id: str):
    """
    Riwayat KKKS yang pernah menjadi operator WK ini.
    PPDM39: INT_SET_COMPONENT → INTEREST_SET → BUSINESS_ASSOCIATE
    """
    sb = get_supabase()
    result = (
        sb.table("int_set_component")
        .select("interest_set_id, interest_set_seq_no, active_ind, effective_date, expiry_date")
        .eq("land_right_id", wk_id)
        .execute()
    )
    return {"wk_id": wk_id, "operatorship": result.data}


@router.get("/stats/ringkasan", summary="Statistik ringkasan semua WK")
async def stats_wk():
    """Dashboard stats — total WK, aktif, terminasi."""
    sb = get_supabase()
    total = sb.table("land_right").select("land_right_id", count="exact").execute()
    aktif = (
        sb.table("land_right")
        .select("land_right_id", count="exact")
        .eq("land_right_category", "WK_ACTIVE")
        .execute()
    )
    return {
        "total_wk": total.count,
        "wk_aktif": aktif.count,
        "wk_terminasi": (total.count or 0) - (aktif.count or 0),
    }
