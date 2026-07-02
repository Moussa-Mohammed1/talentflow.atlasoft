import secrets
from urllib.parse import urlencode

import httpx
import jwt
from datetime import datetime, timedelta, UTC
from fastapi import HTTPException, status

from app.core.config import settings

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"

SCOPES = ["openid", "profile", "email"]


class LinkedInService:

    @staticmethod
    def generate_state() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def sign_state(state: str) -> str:
        payload = {
            "state": state,
            "exp": datetime.now(UTC) + timedelta(minutes=10),
        }
        return jwt.encode(payload, settings.secret_key, algorithm="HS256")

    @staticmethod
    def verify_signed_state(signed_state: str) -> str | None:
        try:
            payload = jwt.decode(
                signed_state, settings.secret_key, algorithms=["HS256"]
            )
            return payload.get("state")
        except jwt.PyJWTError:
            return None

    @staticmethod
    def get_authorization_url(state: str) -> str:
        params = {
            "response_type": "code",
            "client_id": settings.linkedin_client_id,
            "redirect_uri": settings.linkedin_redirect_uri,
            "state": state,
            "scope": " ".join(SCOPES),
        }
        return f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"

    @staticmethod
    async def exchange_code(code: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.post(
                    LINKEDIN_TOKEN_URL,
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "client_id": settings.linkedin_client_id,
                        "client_secret": settings.linkedin_client_secret,
                        "redirect_uri": settings.linkedin_redirect_uri,
                    },
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                )
                response.raise_for_status()
                return response.json()
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="LinkedIn API timeout",
                )
            except httpx.HTTPStatusError as e:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"LinkedIn token exchange failed: {e.response.text}",
                )

    @staticmethod
    async def get_user_info(access_token: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.get(
                    LINKEDIN_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                response.raise_for_status()
                data = response.json()
                if "sub" not in data:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Invalid LinkedIn user info response",
                    )
                return data
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="LinkedIn API timeout",
                )
            except httpx.HTTPStatusError as e:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"LinkedIn user info failed: {e.response.text}",
                )
