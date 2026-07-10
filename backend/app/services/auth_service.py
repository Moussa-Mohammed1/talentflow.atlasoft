import secrets
import os
import uuid
import random
from datetime import datetime, timedelta
from pathlib import Path

import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.schemas.auth import UserResponse
from app.models.user import User
from app.core.security import (
    verify_password,
    create_access_token,
    hash_password,
)
from app.services.email_service import EmailService

AVATAR_DIR = Path("storage/avatars")

EMAIL_SUFFIX = os.getenv("EMAIL_SUFFIX")
PASSWORD_PATTERN = os.getenv("PASSWORD_PATTERN")
APP_URL = os.getenv("APP_URL")


def build_avatar_url(avatar: str | None) -> str | None:
    if not avatar:
        return None
    if avatar.startswith("/"):
        return f"{APP_URL}{avatar}"
    return avatar


async def download_external_avatar(url: str) -> str | None:
    if not url or not url.startswith(("http://", "https://")):
        return None
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            ext = ".jpg"
            if "png" in content_type:
                ext = ".png"
            elif "gif" in content_type:
                ext = ".gif"
            elif "webp" in content_type:
                ext = ".webp"
            unique_name = f"{uuid.uuid4()}{ext}"
            file_path = AVATAR_DIR / unique_name
            with open(file_path, "wb") as f:
                f.write(response.content)
            return f"/storage/avatars/{unique_name}"
    except Exception:
        return None


class AuthService:

    @staticmethod
    def login(
        db: Session,
        email: str,
        password: str
    ):

        if not email.lower().endswith(EMAIL_SUFFIX):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Origine non autorisée"
            )

        user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )
        print("\n\nUSER FOUND:", user is not None)
        if user:
            print("EMAIL:", user.email)
            print("HASH:", user.hashed_password)
            print("PASSWORD:" , password)
            result = verify_password(
                password,
                user.hashed_password
            )

            print("PASSWORD MATCH:", result)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Identifiants invalides"
            )

        if not verify_password(
            password,
            user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Identifiants invalides"
            )

        token = create_access_token(
            user.id,
            user.role
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "fullname": user.fullname,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "must_change_password": user.must_change_password,
                "avatar": build_avatar_url(user.avatar),
                "email_verified": user.email_verified,
                "email_verified_at": user.email_verified_at,
                "created_at": user.created_at,
            },
            "must_change_password":
                user.must_change_password
        }

    @staticmethod
    async def forgot_password(db: Session, email: str):
        user = db.query(User).filter(User.email == email).first()
        if user:
            otp_code = str(random.randint(100000, 999999))
            user.reset_code = otp_code
            user.reset_code_expires_at = datetime.utcnow() + timedelta(minutes=15)
            db.commit()
            await EmailService.send_otp_email(to=email, otp_code=otp_code)

        return {"message": "Si l'adresse email existe, un code de réinitialisation vous a été envoyé."}

    @staticmethod
    def reset_password(db: Session, email: str, otp_code: str, new_password: str):
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.reset_code or user.reset_code != otp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Code de vérification invalide ou expiré."
            )

        if not user.reset_code_expires_at or user.reset_code_expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Code de vérification expiré. Veuillez refaire une demande."
            )

        user.hashed_password = hash_password(new_password)
        user.reset_code = None
        user.reset_code_expires_at = None
        user.must_change_password = False
        db.commit()

        return {"message": "Mot de passe réinitialisé avec succès."}

    @staticmethod
    def handle_linkedin_user(
        db: Session,
        linkedin_data: dict,
        local_avatar: str | None = None,
    ) -> User:
        email = linkedin_data.get("email", "")
        linkedin_id = linkedin_data.get("sub", "")
        given_name = linkedin_data.get("given_name", "")
        family_name = linkedin_data.get("family_name", "")
        fullname = f"{given_name} {family_name}".strip()
        if not fullname:
            fullname = linkedin_data.get("name", "LinkedIn User")
        avatar_path = local_avatar or linkedin_data.get("picture", "")

        user = db.query(User).filter(
            User.linkedin_id == linkedin_id
        ).first()
        if user:
            if avatar_path:
                user.avatar = avatar_path
            if fullname:
                user.fullname = fullname
            db.commit()
            db.refresh(user)
            return user

        if email:
            user = db.query(User).filter(
                User.email == email
            ).first()
            if user:
                user.linkedin_id = linkedin_id
                user.auth_provider = "linkedin"
                if avatar_path:
                    user.avatar = avatar_path
                if fullname:
                    user.fullname = fullname
                user.email_verified = True
                db.commit()
                db.refresh(user)
                return user

        random_password = secrets.token_urlsafe(32)
        user = User(
            fullname=fullname,
            email=email or f"linkedin_{linkedin_id}@placeholder.com",
            hashed_password=hash_password(random_password),
            linkedin_id=linkedin_id,
            auth_provider="linkedin",
            avatar=avatar_path,
            email_verified=True,
            is_active=True,
            must_change_password=False,
            role="RECRUITER",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user