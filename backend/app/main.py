"""
DBEP-Next Backend — FastAPI Application
SKK Migas · Spektrum IOG 4.0
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import wilayah_kerja, kkks, dokumen, search, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"DBEP-Next API starting — env: {settings.APP_ENV}")
    yield
    print("DBEP-Next API shutdown")


app = FastAPI(
    title="DBEP-Next API",
    description="Database Eksplorasi & Produksi — SKK Migas · PPDM39",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers — mencerminkan struktur navigasi DBEP
app.include_router(auth.router,          prefix="/api/auth",    tags=["Auth"])
app.include_router(wilayah_kerja.router, prefix="/api/wk",      tags=["Wilayah Kerja"])
app.include_router(kkks.router,          prefix="/api/kkks",    tags=["KKKS"])
app.include_router(dokumen.router,       prefix="/api/dokumen", tags=["Dokumen"])
app.include_router(search.router,        prefix="/api/search",  tags=["Search"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": "DBEP-Next API",
        "version": "0.1.0",
        "status": "running",
        "ppdm_version": "3.9",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
