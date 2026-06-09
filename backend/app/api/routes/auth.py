from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db

from app.schemas.auth import LoginRequest, LoginResponse

from app.schemas.invitation import (
    InviteUserRequest,
    ValidateInvitationResponse,
    AcceptInvitationRequest,
)

from app.services.auth_service import AuthService
from app.services.invitation_service import InvitationService

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post(
    "/login",
    response_model=LoginResponse
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    return AuthService.login(
        db=db,
        email=payload.email,
        password=payload.password,
    )


@router.post("/invite")
def invite_user(
    payload: InviteUserRequest,
    db: Session = Depends(get_db),
):
    return InvitationService.invite_user(
        db=db,
        email=payload.email,
        role=payload.role,
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