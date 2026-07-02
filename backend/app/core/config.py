from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    app_url: str = "http://localhost:8000"
    secret_key: str = ""
    frontend_url: str = "http://localhost:3000"
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = "http://localhost:8000/api/auth/linkedin/callback"

    model_config = {
        "env_file": str(Path(__file__).resolve().parent.parent / ".env"),
        "extra": "ignore",
    }


settings = Settings()
