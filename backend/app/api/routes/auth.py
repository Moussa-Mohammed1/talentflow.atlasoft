from fastapi import APIRouter, Depends, Response
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
        "user": UserResponse.model_validate(current_user)
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