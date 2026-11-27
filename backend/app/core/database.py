from __future__ import annotations

import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Load fallback .env only when environment variables are not already exported.
package_env = Path(__file__).resolve().parents[1] / ".env"
if package_env.exists():
    load_dotenv(package_env, override=False)
else:
    located = find_dotenv()
    if located:
        load_dotenv(located, override=False)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set.\n"
        "Put a .env file at backend/app/.env or export DATABASE_URL in your environment."
    )

DB_ECHO = os.getenv("DB_ECHO", "false").strip().lower() in {"1", "true", "yes"}

connect_args = {"connect_timeout": 5} if DATABASE_URL.startswith("postgres") else {}

engine = create_engine(
    DATABASE_URL,
    echo=DB_ECHO,
    pool_pre_ping=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
