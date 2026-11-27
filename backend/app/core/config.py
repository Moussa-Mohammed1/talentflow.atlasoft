from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: Literal["development", "test", "staging", "production"] = "development"
    app_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"
    cors_origins: str = ""

    secret_key: str = ""
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    cookie_secure: bool | None = None
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str | None = None

    database_url: str = ""
    db_echo: bool = False
    log_level: str = "INFO"

    default_password: str = ""
    email_suffix: str = ""
    password_pattern: str = ""

    llm_api_key: str = ""
    llm_model: str = "deepseek-chat"

    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = "http://localhost:8000/api/auth/linkedin/callback"
    linkedin_redirect_url: str = ""

    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = ""
    mail_port: int = 587
    mail_server: str = ""
    mail_starttls: bool = True
    mail_ssl_tls: bool = False
    invitation_frontend_url: str = ""

    storage_backend: Literal["local", "s3"] = "local"
    storage_root: str = "storage"
    s3_endpoint_url: str | None = None
    s3_region: str = "us-east-1"
    s3_bucket: str = "talentflow-storage"
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_use_ssl: bool = False

    redis_url: str = ""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        raw = [item.strip().rstrip("/") for item in self.cors_origins.split(",") if item.strip()]
        if not raw and self.frontend_url:
            primary = self.frontend_url.strip().rstrip("/")
            raw = [primary]
            if "://localhost:" in primary:
                raw.append(primary.replace("://localhost:", "://127.0.0.1:"))
            elif "://127.0.0.1:" in primary:
                raw.append(primary.replace("://127.0.0.1:", "://localhost:"))
        seen: list[str] = []
        for origin in raw:
            if origin and origin != "*" and origin not in seen:
                seen.append(origin)
        return seen

    @property
    def cookie_secure_effective(self) -> bool:
        if self.cookie_secure is not None:
            return self.cookie_secure
        return self.environment in {"staging", "production"}

    def validate_runtime_security(self) -> None:
        if self.environment in {"staging", "production"}:
            if not self.secret_key or len(self.secret_key.strip()) < 32:
                raise RuntimeError(
                    "SECRET_KEY must be at least 32 characters in staging/production environments."
                )
            if not self.cors_origins_list:
                raise RuntimeError(
                    "CORS_ORIGINS or FRONTEND_URL must define explicit allowed origins."
                )
            if self.cookie_samesite == "none" and not self.cookie_secure_effective:
                raise RuntimeError("COOKIE_SECURE must be True when COOKIE_SAMESITE=none.")


settings = Settings()

if settings.database_url:
    os.environ.setdefault("DATABASE_URL", settings.database_url)
if settings.llm_api_key:
    os.environ.setdefault("LLM_API_KEY", settings.llm_api_key)
if settings.secret_key:
    os.environ.setdefault("SECRET_KEY", settings.secret_key)
