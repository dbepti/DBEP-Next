from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import wilayah_kerja, kkks, dokumen, search, auth, dashboard
from app.core.config import settings

app = FastAPI(title="DBEP-Next API", version="0.1.0")

# CORS — allow semua origin saat development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    print(f"DBEP-Next API starting — env: {settings.APP_ENV}")

@app.on_event("shutdown")
async def shutdown():
    print("DBEP-Next API shutdown")

app.include_router(wilayah_kerja.router, prefix="/api/wk",     tags=["Wilayah Kerja"])
app.include_router(kkks.router,          prefix="/api/kkks",   tags=["KKKS"])
app.include_router(dokumen.router,       prefix="/api/dokumen", tags=["Dokumen"])
app.include_router(search.router,        prefix="/api/search",  tags=["Search"])
app.include_router(auth.router,          prefix="/api/auth",    tags=["Auth"])
app.include_router(dashboard.router,     prefix="/api/dashboard", tags=["Dashboard"])

@app.get("/")
def root():
    return {"status": "ok", "app": "DBEP-Next API"}
