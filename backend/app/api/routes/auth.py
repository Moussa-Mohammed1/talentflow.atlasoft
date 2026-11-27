from fastapi import APIRouter, Depends, Response, HTTPException, status, UploadFile, File, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pathlib import Path
import shutil
import uuid
import os
from datetime import datetime
from app.core.database import get_db
from app.models.user import User
from app.models.resume import Resume
from app.models.llm_usage import LLMUsage
from app.models.invitation import Invitation
from app.repositories.candidat_repository import CandidatRepository
from app.core.security import (
    REFRESH_COOKIE_NAME,
    clear_auth_cookies,
    consume_oauth_exchange_code,
    create_access_token,
    create_oauth_exchange_code,
    create_refresh_token,
    decode_refresh_token,
    get_current_user,
    set_auth_cookies,
)
from app.schemas.auth import (
    ForgotPasswordRequest,
    LLMUsageByAction,
    LoginRequest,
    LoginResponse,
    OAuthExchangeRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserResponse,
    UserStatsResponse,
)
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
from app.services.storage import get_storage_backend
from app.core.config import settings

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


def _serialize_user(user: User) -> dict:
    return {
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
        "auth_provider": user.auth_provider,
    }


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
    user_info = result["user"]
    refresh_token = create_refresh_token(user_info["id"], str(user_info["role"]))
    set_auth_cookies(
        response,
        access_token=result["access_token"],
        refresh_token=refresh_token,
    )
    return result


@router.post("/refresh")
def refresh_session(
    request: Request,
    response: Response,
    payload: RefreshTokenRequest | None = None,
    db: Session = Depends(get_db),
):
    raw_refresh = request.cookies.get(REFRESH_COOKIE_NAME) or (
        payload.refresh_token if payload else None
    )
    if not raw_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton de rafraîchissement manquant",
        )

    try:
        user_id = decode_refresh_token(raw_refresh)
    except ValueError:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton de rafraîchissement invalide ou expiré",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.is_active is False:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou inactif",
        )

    access_token = create_access_token(user.id, str(user.role))
    new_refresh_token = create_refresh_token(user.id, str(user.role))
    set_auth_cookies(response, access_token=access_token, refresh_token=new_refresh_token)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _serialize_user(user),
    }


@router.post("/linkedin/exchange")
def exchange_linkedin_oauth_code(
    payload: OAuthExchangeRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        user_id = consume_oauth_exchange_code(payload.code)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Code d'échange OAuth invalide ou expiré",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou inactif",
        )

    access_token = create_access_token(user.id, str(user.role))
    refresh_token = create_refresh_token(user.id, str(user.role))
    set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _serialize_user(user),
    }

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


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    return await AuthService.forgot_password(
        db=db,
        email=payload.email,
    )


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    return AuthService.reset_password(
        db=db,
        email=payload.email,
        otp_code=payload.otp_code,
        new_password=payload.new_password,
    )


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


@router.get("/me/stats", response_model=UserStatsResponse)
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume_count = (
        db.query(func.count(Resume.id))
        .filter(Resume.recruiter_id == current_user.id)
        .scalar() or 0
    )
    llm_count = (
        db.query(func.count(LLMUsage.id))
        .filter(LLMUsage.recruiter_id == current_user.id)
        .scalar() or 0
    )
    llm_by_action_rows = (
        db.query(LLMUsage.action, func.count(LLMUsage.id).label("count"))
        .filter(LLMUsage.recruiter_id == current_user.id)
        .group_by(LLMUsage.action)
        .all()
    )
    llm_usage_by_action = [
        LLMUsageByAction(action=row.action, count=row.count)
        for row in llm_by_action_rows
    ]
    invitations_sent = (
        db.query(func.count(Invitation.id))
        .filter(Invitation.invited_by == current_user.id)
        .scalar() or 0
    )
    invitations_accepted = (
        db.query(func.count(Invitation.id))
        .filter(Invitation.invited_by == current_user.id, Invitation.accepted == True)
        .scalar() or 0
    )
    invitations_refused = (
        db.query(func.count(Invitation.id))
        .filter(
            Invitation.invited_by == current_user.id,
            Invitation.accepted == False,
            Invitation.expires_at < datetime.utcnow(),
        )
        .scalar() or 0
    )

    return UserStatsResponse(
        resume_count=resume_count,
        successful_llm_requests=llm_count,
        llm_usage_by_action=llm_usage_by_action,
        invitations_sent=invitations_sent,
        invitations_accepted=invitations_accepted,
        invitations_refused=invitations_refused,
    )


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
    key = f"avatars/{unique_name}"
    get_storage_backend().save_file(key, file.file, content_type=file.content_type)

    current_user.avatar = f"/api/files/{key}"
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
        secure=settings.cookie_secure_effective,
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

    token_data = await LinkedInService.exchange_code(code)
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Échec de l'obtention du jeton d'accès LinkedIn",
        )

    user_info = await LinkedInService.get_user_info(access_token)

    linkedin_email = user_info.get("email", "")
    frontend_base = settings.frontend_url.rstrip("/")

    allowed_suffix = (settings.email_suffix or EMAIL_SUFFIX or "").strip().lower()
    if allowed_suffix and not linkedin_email.lower().endswith(allowed_suffix):
        denied = RedirectResponse(
            url=f"{frontend_base}/login?linkedin_error=unauthorized_email",
            status_code=status.HTTP_302_FOUND,
        )
        denied.delete_cookie(key="oauth_state", path="/api/auth/linkedin/callback")
        return denied

    existing_user = db.query(User).filter(User.email == linkedin_email).first()
    if not existing_user:
        denied = RedirectResponse(
            url=f"{frontend_base}/login?linkedin_error=unauthorized_email",
            status_code=status.HTTP_302_FOUND,
        )
        denied.delete_cookie(key="oauth_state", path="/api/auth/linkedin/callback")
        return denied

    linkedin_picture = user_info.get("picture", "")
    local_avatar = await download_external_avatar(linkedin_picture) if linkedin_picture else None

    user = AuthService.handle_linkedin_user(
        db=db,
        linkedin_data=user_info,
        local_avatar=local_avatar,
    )

    jwt_token = create_access_token(user.id, str(user.role))
    refresh_token = create_refresh_token(user.id, str(user.role))
    oauth_code = create_oauth_exchange_code(user.id, str(user.role))

    redirect = RedirectResponse(
        url=f"{frontend_base}/login?oauth_code={oauth_code}",
        status_code=status.HTTP_302_FOUND,
    )
    redirect.delete_cookie(key="oauth_state", path="/api/auth/linkedin/callback")
    set_auth_cookies(redirect, access_token=jwt_token, refresh_token=refresh_token)
    return redirect


@router.delete("/me")
def delete_account(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.avatar:
        avatar_ref = current_user.avatar
        if avatar_ref.startswith("/api/files/"):
            avatar_ref = avatar_ref[len("/api/files/"):]
        get_storage_backend().delete(avatar_ref)

    clear_auth_cookies(response)

    db.delete(current_user)
    db.commit()

    return {"message": "Compte supprimé avec succès"}


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookies(response)

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