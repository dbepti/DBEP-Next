"""KKKS endpoints — PPDM39: BUSINESS_ASSOCIATE"""
from fastapi import APIRouter, Query
from typing import Optional
from app.core.database import get_supabase

router = APIRouter()


@router.get("/", summary="Daftar KKKS")
async def list_kkks(limit: int = Query(100, le=500), offset: int = 0):
    sb = get_supabase()
    result = (
        sb.table("business_associate")
        .select("business_associate_id, ba_long_name, ba_type, ba_category")
        .eq("ba_type", "KKKS")
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data


@router.get("/{kkks_id}", summary="Detail KKKS")
async def get_kkks(kkks_id: str):
    sb = get_supabase()
    result = (
        sb.table("business_associate")
        .select("*")
        .eq("business_associate_id", kkks_id)
        .single()
        .execute()
    )
    return result.data


@router.get("/{kkks_id}/wk", summary="WK yang dioperasikan KKKS ini")
async def get_kkks_wk(kkks_id: str):
    sb = get_supabase()
    result = (
        sb.table("int_set_component")
        .select("land_right_id, interest_set_id, effective_date, expiry_date")
        .eq("business_associate_id", kkks_id)
        .execute()
    )
    return {"kkks_id": kkks_id, "wilayah_kerja": result.data}
