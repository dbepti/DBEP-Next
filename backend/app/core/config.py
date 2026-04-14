from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "DBEP-Next"
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "change-me-in-production"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    DATABASE_URL: str = ""

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://*.app.github.dev",
    ]

    # Storage
    STORAGE_BACKEND: str = "supabase"
    STORAGE_BUCKET: str = "dbep-documents"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
