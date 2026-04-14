"""Auth endpoints — Supabase Auth (dev) / Keycloak (prod)"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_supabase

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login", summary="Login")
async def login(req: LoginRequest):
    sb = get_supabase()
    try:
        result = sb.auth.sign_in_with_password({"email": req.email, "password": req.password})
        return {
            "access_token": result.session.access_token,
            "user": {"email": result.user.email, "id": result.user.id},
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Email atau password salah")


@router.post("/logout", summary="Logout")
async def logout():
    sb = get_supabase()
    sb.auth.sign_out()
    return {"message": "Logout berhasil"}


@router.get("/me", summary="Info user saat ini")
async def me():
    sb = get_supabase()
    user = sb.auth.get_user()
    if not user:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    return {"user": user.user}
