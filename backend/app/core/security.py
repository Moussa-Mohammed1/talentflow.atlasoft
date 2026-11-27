from __future__ import annotations

import os
import secrets
from collections import OrderedDict
from datetime import UTC, datetime, timedelta
from threading import Lock
from typing import Any

import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

ALGORITHM = "HS256"
ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

_OAUTH_CODE_CACHE_MAX = 2048
_used_oauth_codes: OrderedDict[str, float] = OrderedDict()
_oauth_code_lock = Lock()


def get_secret_key() -> str:
    key = settings.secret_key or os.getenv("SECRET_KEY") or ""
    if not key.strip():
        raise RuntimeError("SECRET_KEY environment variable is not configured.")
    return key


def decode_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    """Validate JWT signature, expiration, subject, and token type."""
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
    except (jwt.PyJWTError, RuntimeError) as exc:
        raise ValueError("Invalid token") from exc

    subject = payload.get("sub")
    if subject is None:
        raise ValueError("Token subject is missing")

    token_type = payload.get("type")
    if expected_type == "access":
        if token_type not in (None, "access"):
            raise ValueError("Invalid access token type")
    elif token_type != expected_type:
        raise ValueError(f"Invalid {expected_type} token type")

    return payload


def decode_access_token(token: str) -> int:
    """Validate an access token and return its user id."""
    payload = decode_token(token, expected_type="access")
    try:
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Invalid access token subject") from exc


def decode_refresh_token(token: str) -> int:
    """Validate a refresh token and return its user id."""
    payload = decode_token(token, expected_type="refresh")
    try:
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Invalid refresh token subject") from exc


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "jti": secrets.token_hex(8),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, get_secret_key(), algorithm=ALGORITHM)


def create_refresh_token(user_id: int, role: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "refresh",
        "jti": secrets.token_hex(12),
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
    }
    return jwt.encode(payload, get_secret_key(), algorithm=ALGORITHM)


def create_oauth_exchange_code(user_id: int, role: str) -> str:
    """Create a short-lived single-use OAuth exchange token (never exposed as session JWT)."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "oauth_exchange",
        "jti": secrets.token_hex(16),
        "iat": now,
        "exp": now + timedelta(seconds=60),
    }
    return jwt.encode(payload, get_secret_key(), algorithm=ALGORITHM)


def consume_oauth_exchange_code(code: str) -> int:
    """Verify and consume a single-use OAuth exchange code, returning user_id."""
    payload = decode_token(code, expected_type="oauth_exchange")
    jti = payload.get("jti")
    exp = float(payload.get("exp", 0))
    now_ts = datetime.now(UTC).timestamp()

    if not jti:
        raise ValueError("Missing OAuth code nonce")

    with _oauth_code_lock:
        expired_keys = [k for k, v in _used_oauth_codes.items() if v < now_ts]
        for k in expired_keys:
            _used_oauth_codes.pop(k, None)

        if jti in _used_oauth_codes:
            raise ValueError("OAuth exchange code already used")

        _used_oauth_codes[jti] = exp
        while len(_used_oauth_codes) > _OAUTH_CODE_CACHE_MAX:
            _used_oauth_codes.popitem(last=False)

    return int(payload["sub"])


def create_ws_ticket(user_id: int) -> str:
    """Mint a short-lived (30s) single-use WebSocket handshake ticket."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "type": "ws_ticket",
        "jti": secrets.token_hex(12),
        "iat": now,
        "exp": now + timedelta(seconds=30),
    }
    return jwt.encode(payload, get_secret_key(), algorithm=ALGORITHM)


def consume_ws_ticket(ticket: str) -> int:
    """Validate and consume a single-use WebSocket handshake ticket."""
    payload = decode_token(ticket, expected_type="ws_ticket")
    jti = payload.get("jti")
    exp = float(payload.get("exp", 0))
    now_ts = datetime.now(UTC).timestamp()
    if not jti:
        raise ValueError("Missing WebSocket ticket nonce")

    with _oauth_code_lock:
        expired_keys = [k for k, v in _used_oauth_codes.items() if v < now_ts]
        for k in expired_keys:
            _used_oauth_codes.pop(k, None)
        if jti in _used_oauth_codes:
            raise ValueError("WebSocket ticket already used")
        _used_oauth_codes[jti] = exp
        while len(_used_oauth_codes) > _OAUTH_CODE_CACHE_MAX:
            _used_oauth_codes.popitem(last=False)

    return int(payload["sub"])


def set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str | None = None,
) -> None:
    cookie_kwargs: dict[str, Any] = {
        "httponly": True,
        "secure": settings.cookie_secure_effective,
        "samesite": settings.cookie_samesite,
        "path": "/",
    }
    if settings.cookie_domain:
        cookie_kwargs["domain"] = settings.cookie_domain

    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        **cookie_kwargs,
    )
    if refresh_token:
        response.set_cookie(
            key=REFRESH_COOKIE_NAME,
            value=refresh_token,
            max_age=settings.refresh_token_expire_days * 86400,
            **cookie_kwargs,
        )


def clear_auth_cookies(response: Response) -> None:
    kwargs: dict[str, Any] = {"path": "/"}
    if settings.cookie_domain:
        kwargs["domain"] = settings.cookie_domain
    response.delete_cookie(key=ACCESS_COOKIE_NAME, **kwargs)
    response.delete_cookie(key=REFRESH_COOKIE_NAME, **kwargs)


def extract_access_token(request: Request, bearer_token: str | None) -> str | None:
    if bearer_token:
        return bearer_token
    return request.cookies.get(ACCESS_COOKIE_NAME)


def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    raw_token = extract_access_token(request, token)
    if not raw_token:
        raise credentials_exception

    try:
        user_id_int = decode_access_token(raw_token)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id_int).first()
    if user is None or user.is_active is False:
        raise credentials_exception

    return user
