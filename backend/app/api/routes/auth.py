from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User

from app.core.security import get_current_user
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from fastapi.security import OAuth2PasswordRequestForm
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
        "user": UserResponse.model_validate(current_user)
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