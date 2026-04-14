"""
Dokumen endpoints — WPB, AFE, POD, Cadangan, dll
PPDM39: RM_INFORMATION_ITEM + RM_DATA_STORE + LAND_RIGHT_COMPONENT
"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

from app.core.database import get_supabase
from app.core.config import settings

router = APIRouter()

DOC_TYPES = ["WPB_EKSPLORASI", "WPB_EKSPLOITASI", "AFE", "POD", "POP",
             "CADANGAN", "PROSPECT_LEADS", "KOMITMEN", "JIAN"]

STATUS_OPTIONS = ["ORIGINAL", "REVISI", "VALID"]


class DokumenSummary(BaseModel):
    information_item_id: str    # DBEP_DOC_ID
    land_right_id: str          # WKID
    nama_wk: Optional[str]
    item_name: str              # perihal
    item_type: str              # tipe dokumen
    effective_date: Optional[date]
    doc_status: Optional[str]   # ORIGINAL / REVISI / VALID
    source: str


class DokumenDetail(DokumenSummary):
    kkks_id: Optional[str]
    kkks_nama: Optional[str]
    doc_number: Optional[str]
    anggaran_usulan: Optional[float]
    anggaran_disetujui: Optional[float]
    lokasi_arsip: Optional[str]
    upload_by: Optional[str]
    upload_date: Optional[datetime]
    verified_by: Optional[str]
    verified_date: Optional[datetime]
    # Status kelengkapan (dari CHK_ DBEP lama → RM_INFO_ITEM_STATUS)
    checklist: dict = {}


@router.get("/", response_model=List[DokumenSummary], summary="Daftar dokumen")
async def list_dokumen(
    wk_id: Optional[str] = Query(None, description="Filter by Wilayah Kerja"),
    doc_type: Optional[str] = Query(None, description=f"Tipe: {', '.join(DOC_TYPES)}"),
    tahun: Optional[int] = Query(None, description="Tahun dokumen"),
    status: Optional[str] = Query(None, description="ORIGINAL / REVISI / VALID"),
    kkks_id: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    """
    Daftar dokumen dengan filter.
    Setara dengan 'List Dokumen WP&B' di DBEP lama.
    """
    sb = get_supabase()
    query = sb.table("rm_information_item").select(
        "information_item_id, land_right_id, item_name, item_type, effective_date, source"
    )
    if wk_id:
        query = query.eq("land_right_id", wk_id)
    if doc_type:
        query = query.eq("item_type", doc_type)
    if status:
        query = query.eq("active_ind", status)
    if tahun:
        query = query.gte("effective_date", f"{tahun}-01-01").lte("effective_date", f"{tahun}-12-31")

    result = query.range(offset, offset + limit - 1).execute()
    return result.data


@router.get("/stats", summary="Statistik dokumen")
async def stats_dokumen(wk_id: Optional[str] = None):
    """Stats untuk dashboard — total per tipe dokumen."""
    sb = get_supabase()
    query = sb.table("rm_information_item").select("item_type", count="exact")
    if wk_id:
        query = query.eq("land_right_id", wk_id)
    result = query.execute()
    return {"total": result.count, "wk_id": wk_id}


@router.get("/{doc_id}", response_model=DokumenDetail, summary="Detail dokumen")
async def get_dokumen(doc_id: str):
    """Detail lengkap satu dokumen termasuk checklist kelengkapan."""
    sb = get_supabase()
    result = (
        sb.table("rm_information_item")
        .select("*")
        .eq("information_item_id", doc_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Dokumen '{doc_id}' tidak ditemukan")

    # Ambil status kelengkapan dari RM_INFO_ITEM_STATUS
    status_result = (
        sb.table("rm_info_item_status")
        .select("rmii_status, active_ind")
        .eq("information_item_id", doc_id)
        .execute()
    )
    checklist = {s["rmii_status"]: s["active_ind"] == "Y" for s in (status_result.data or [])}

    return {**result.data, "checklist": checklist}


@router.post("/upload", summary="Upload dokumen baru")
async def upload_dokumen(
    wk_id: str,
    doc_type: str,
    perihal: str,
    tahun: int,
    doc_number: Optional[str] = None,
    file: UploadFile = File(...),
):
    """
    Upload dokumen PDF baru.
    1. Simpan file ke Supabase Storage
    2. Buat record RM_INFORMATION_ITEM
    3. Buat LAND_RIGHT_COMPONENT link
    """
    sb = get_supabase()

    # Validate WK exists
    wk = sb.table("land_right").select("land_right_id").eq("land_right_id", wk_id).execute()
    if not wk.data:
        raise HTTPException(status_code=404, detail=f"WK '{wk_id}' tidak ditemukan")

    # Upload file ke storage
    file_path = f"{doc_type}/{wk_id}/{tahun}/{file.filename}"
    content = await file.read()
    sb.storage.from_(settings.STORAGE_BUCKET).upload(file_path, content)

    # Generate doc ID
    doc_id = f"{wk_id}-{doc_type}-{tahun}-{doc_number or '001'}"

    # Buat RM_INFORMATION_ITEM
    sb.table("rm_information_item").insert({
        "information_item_id": doc_id,
        "land_right_id": wk_id,
        "item_name": perihal,
        "item_type": doc_type,
        "effective_date": f"{tahun}-01-01",
        "active_ind": "ORIGINAL",
        "source": "DBEP_NEXT",
        "row_quality": "GOOD",
    }).execute()

    return {
        "success": True,
        "doc_id": doc_id,
        "file_path": file_path,
        "message": f"Dokumen {doc_id} berhasil diupload",
    }
