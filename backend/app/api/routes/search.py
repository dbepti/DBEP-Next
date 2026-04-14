"""
Search endpoints — Full Text Search + Semantic (pgvector)
PPDM39: RM_INFORMATION_ITEM + RM_THESAURUS_WORD
"""
from fastapi import APIRouter, Query
from typing import Optional, List

from app.core.database import get_supabase

router = APIRouter()


@router.get("/", summary="Cari dokumen")
async def search(
    q: str = Query(..., min_length=2, description="Kata kunci pencarian"),
    wk_id: Optional[str] = None,
    doc_type: Optional[str] = None,
    tahun: Optional[int] = None,
    mode: str = Query("fts", description="fts (full-text) atau semantic"),
    limit: int = Query(20, le=100),
):
    """
    Pencarian dokumen.
    - mode=fts: PostgreSQL tsvector full-text search
    - mode=semantic: pgvector similarity search (AI)
    """
    sb = get_supabase()

    if mode == "semantic":
        # Semantic search via pgvector — panggil RPC function
        result = sb.rpc("search_semantic", {
            "query_text": q,
            "wk_filter": wk_id,
            "doc_type_filter": doc_type,
            "match_count": limit,
        }).execute()
    else:
        # Full-text search via PostgreSQL tsvector
        result = sb.rpc("search_fts", {
            "query_text": q,
            "wk_filter": wk_id,
            "doc_type_filter": doc_type,
            "limit_count": limit,
        }).execute()

    return {
        "query": q,
        "mode": mode,
        "count": len(result.data or []),
        "results": result.data,
    }


@router.get("/suggest", summary="Autocomplete saran pencarian")
async def suggest(q: str = Query(..., min_length=2), limit: int = 10):
    """Saran autocomplete dari RM_THESAURUS_WORD."""
    sb = get_supabase()
    result = (
        sb.table("rm_thesaurus_word")
        .select("thesaurus_word, language_id")
        .ilike("thesaurus_word", f"{q}%")
        .limit(limit)
        .execute()
    )
    return {"suggestions": [r["thesaurus_word"] for r in (result.data or [])]}
