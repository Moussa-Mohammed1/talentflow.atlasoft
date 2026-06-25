from fastapi import APIRouter, Depends, Response, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import uuid
import os
from app.core.database import get_db
from app.models.user import User
from app.repositories.candidat_repository import CandidatRepository
from app.core.security import get_current_user
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse, UpdateProfileRequest
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.invitation import (
    InviteUserRequest,
    ValidateInvitationResponse,
    AcceptInvitationRequest,
)

from app.services.auth_service import AuthService
from app.services.invitation_service import InvitationService

AVATAR_DIR = Path("storage/avatars")

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login")
def login(
        payload: LoginRequest,
        response: Response,
        db: Session = Depends(get_db),
        ):
        result = AuthService.login(
        db=db,
        email=payload.email,
        password=payload.password,
        )

        response.set_cookie(
            key="access_token",
            value=result["access_token"],
            httponly=True,
            secure=False,  
            samesite="lax",
            max_age=60 * 60 * 24,
            path="/",
        )

        return result

# @router.post(
#     "/login",
#     response_model=LoginResponse
# )
# def login(
#     form_data: OAuth2PasswordRequestForm = Depends(),
#     db: Session = Depends(get_db)
# ):
#     return AuthService.login(
#         db=db,
#         email=form_data.username,  
#         password=form_data.password,
#     )


@router.post("/invite")
async def invite_user(
    payload: InviteUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await InvitationService.invite_user(
        db=db,
        email=payload.email,
        invited_by=current_user.id,
    )


@router.get(
    "/invite/{token}",
    response_model=ValidateInvitationResponse
)
def validate_invitation(
    token: str,
    db: Session = Depends(get_db),
):
    return InvitationService.validate_invitation(
        db=db,
        token=token,
    )
@router.get("/me")   
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return {
        "user": {
            "id": current_user.id,
            "fullname": current_user.fullname,
            "email": current_user.email,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "must_change_password": current_user.must_change_password,
            "avatar": f"{os.getenv('APP_URL')}{current_user.avatar}",
            "email_verified": current_user.email_verified,
            "email_verified_at": current_user.email_verified_at,
            "created_at": current_user.created_at,
        }
    }

@router.patch("/me")
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = CandidatRepository.update_profile(
        db=db,
        user=current_user,
        payload=payload,
    )

    return {
        "user": {
            "id": current_user.id,
            "fullname": current_user.fullname,
            "email": current_user.email,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "must_change_password": current_user.must_change_password,
            "avatar": f"{os.getenv('APP_URL')}{current_user.avatar}",
            "email_verified": current_user.email_verified,
            "email_verified_at": current_user.email_verified_at,
            "created_at": current_user.created_at,
        }
    }

@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        raise HTTPException(status_code=400, detail="Invalid image type. Allowed: jpg, jpeg, png, gif, webp")

    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = AVATAR_DIR / unique_name

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    current_user.avatar = f"/storage/avatars/{unique_name}"
    db.commit()
    db.refresh(current_user)
   
    return {
        "user": {
            "id": current_user.id,
            "fullname": current_user.fullname,
            "email": current_user.email,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "must_change_password": current_user.must_change_password,
            "avatar": f"{os.getenv('APP_URL')}{current_user.avatar}",
            "email_verified": current_user.email_verified,
            "email_verified_at": current_user.email_verified_at,
            "created_at": current_user.created_at,
        }
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        path="/",
    )

    return {
        "message": "Successfully logged out"
    }

@router.post("/accept-invite")
def accept_invitation(
    payload: AcceptInvitationRequest,
    db: Session = Depends(get_db),
):
    return InvitationService.accept_invitation(
        db=db,
        token=payload.token,
        fullname=payload.fullname,
        password=payload.password,
    )