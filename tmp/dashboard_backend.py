"""
Dashboard endpoints — DBEP-Next v2
Single endpoint yang return semua angka + data chart yang dibutuhkan
halaman /dashboard dalam 1 response. Data diambil dari 6 view
agregat v_stats_* di Supabase (lihat dashboard_views_v3.sql).
"""
from fastapi import APIRouter, HTTPException

from app.core.database import get_supabase

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats():
    """
    Return semua statistik dashboard dalam 1 response:
      - kpi:       1 row dari v_stats_kpi_header (9 angka KPI)
      - wk_status: status WK (Aktif / Terminasi / Lainnya)
      - kategori:  jumlah dokumen per kategori (AFE, WPB, POD, dll)
      - cadangan:  agregat cadangan per fluida (OIL, GAS)
      - resources: prospect vs lead
      - top_wk:    top 10 WK berdasarkan jumlah dokumen
    """
    sb = get_supabase()

    try:
        kpi_res       = sb.from_("v_stats_kpi_header").select("*").limit(1).execute()
        wk_status_res = sb.from_("v_stats_wk_status").select("*").execute()
        kategori_res  = sb.from_("v_stats_dokumen_kategori").select("*").execute()
        cadangan_res  = sb.from_("v_stats_cadangan_total").select("*").execute()
        resources_res = sb.from_("v_stats_resources_jenis").select("*").execute()
        top_wk_res    = sb.from_("v_stats_top_wk_dokumen").select("*").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal query Supabase: {e}")

    kpi = kpi_res.data[0] if kpi_res.data else {}

    return {
        "kpi":       kpi,
        "wk_status": wk_status_res.data or [],
        "kategori":  kategori_res.data or [],
        "cadangan":  cadangan_res.data or [],
        "resources": resources_res.data or [],
        "top_wk":    top_wk_res.data or [],
    }
