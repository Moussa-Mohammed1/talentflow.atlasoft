from fastapi import APIRouter, Depends, Response, HTTPException, status, UploadFile, File, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import uuid
import os
from app.core.database import get_db
from app.models.user import User
from app.repositories.candidat_repository import CandidatRepository
from app.core.security import get_current_user, create_access_token
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse, UpdateProfileRequest
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.invitation import (
    InviteUserRequest,
    ValidateInvitationResponse,
    AcceptInvitationRequest,
    InvitationResponse,
)

from app.services.auth_service import AuthService, build_avatar_url, download_external_avatar, EMAIL_SUFFIX
from app.services.invitation_service import InvitationService
from app.services.linkedin_service import LinkedInService
from app.core.config import settings

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
    "/invitations",
    response_model=list[InvitationResponse],
)
def get_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InvitationService.get_invitations(
        db=db,
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
            "avatar": build_avatar_url(current_user.avatar),
            "email_verified": current_user.email_verified,
            "email_verified_at": current_user.email_verified_at,
            "created_at": current_user.created_at,
            "auth_provider": current_user.auth_provider,
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
            "avatar": build_avatar_url(current_user.avatar),
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
        raise HTTPException(status_code=400, detail="Fichier requis")

    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        raise HTTPException(status_code=400, detail="Type d'image invalide. Autorisés : jpg, jpeg, png, gif, webp")

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
            "avatar": build_avatar_url(current_user.avatar),
            "email_verified": current_user.email_verified,
            "email_verified_at": current_user.email_verified_at,
            "created_at": current_user.created_at,
        }
    }

@router.get("/linkedin/login")
async def linkedin_login():
    state = LinkedInService.generate_state()
    signed_state = LinkedInService.sign_state(state)

    auth_url = LinkedInService.get_authorization_url(state)

    redirect = RedirectResponse(url=auth_url, status_code=status.HTTP_302_FOUND)
    redirect.set_cookie(
        key="oauth_state",
        value=signed_state,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=600,
        path="/api/auth/linkedin/callback",
    )
    return redirect


@router.get("/linkedin/callback")
async def linkedin_callback(
    code: str,
    state: str,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    signed_state = request.cookies.get("oauth_state")
    if not signed_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="État OAuth manquant",
        )

    expected_state = LinkedInService.verify_signed_state(signed_state)
    if not expected_state or expected_state != state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="État OAuth invalide",
        )

    response.delete_cookie(
        key="oauth_state",
        path="/api/auth/linkedin/callback",
    )

    token_data = await LinkedInService.exchange_code(code)
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Échec de l'obtention du jeton d'accès LinkedIn",
        )

    user_info = await LinkedInService.get_user_info(access_token)

    linkedin_email = user_info.get("email", "")

    if not linkedin_email.lower().endswith(EMAIL_SUFFIX):
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?linkedin_error=unauthorized_email",
            status_code=status.HTTP_302_FOUND,
        )

    existing_user = db.query(User).filter(User.email == linkedin_email).first()
    if not existing_user:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?linkedin_error=unauthorized_email",
            status_code=status.HTTP_302_FOUND,
        )

    linkedin_picture = user_info.get("picture", "")
    local_avatar = await download_external_avatar(linkedin_picture) if linkedin_picture else None

    user = AuthService.handle_linkedin_user(
        db=db,
        linkedin_data=user_info,
        local_avatar=local_avatar,
    )

    jwt_token = create_access_token(user.id, user.role)

    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24,
        path="/",
    )

    redirect_url = f"{settings.frontend_url}/login?token={jwt_token}"
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        path="/",
    )

    return {
        "message": "Déconnexion réussie"
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


@router.delete("/invitations/{invitation_id}")
def delete_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InvitationService.delete_invitation(
        db=db,
        invitation_id=invitation_id,
        user_id=current_user.id,
    )