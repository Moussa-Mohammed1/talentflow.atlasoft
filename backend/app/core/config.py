from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    app_url: str = os.getenv("APP_URL")
    secret_key: str = ""
    frontend_url: str = os.getenv("FRONTEND_URL")
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = os.getenv("LINKEDIN_REDIRECT_URI")
    database_url: str = ""
    default_password: str = os.getenv("DEFAULT_PASSWORD")
    email_suffix: str = ""
    llm_api_key: str = ""
    llm_model: str = os.getenv("LLM_MODEL")
    linkedin_redirect_url: str = ""
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = ""
    mail_port: int = 587
    mail_server: str = ""
    mail_starttls: bool = True
    mail_ssl_tls: bool = False
    invitation_frontend_url: str = ""

    model_config = {
        "env_file": str(Path(__file__).resolve().parent.parent / ".env"),
        "extra": "ignore",
    }


settings = Settings()

if settings.database_url:
    os.environ.setdefault("DATABASE_URL", settings.database_url)
if settings.llm_api_key:
    os.environ.setdefault("LLM_API_KEY", settings.llm_api_key)
if settings.secret_key:
    os.environ.setdefault("SECRET_KEY", settings.secret_key)
