import os
from datetime import datetime, timedelta
import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.invitation import Invitation
from app.services.email_service import EmailService
from app.core.security import hash_password

EMAIL_SUFFIX = os.getenv("EMAIL_SUFFIX")


class InvitationService:

    INVITATION_EXPIRATION_HOURS = 48

    @staticmethod
    async def invite_user(
        db: Session,
        email: str,
        invited_by: int,
    ):

        if not email.lower().endswith(EMAIL_SUFFIX):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Les invitations sont réservées aux adresses {EMAIL_SUFFIX}"
            )

        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )

        existing_invitation = (
            db.query(Invitation)
            .filter(
                Invitation.email == email,
                Invitation.accepted == False
            )
            .first()
        )

        if existing_invitation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pending invitation already exists"
            )

        token = secrets.token_urlsafe(32)

        invitation = Invitation(
            email=email,
            token=token,
            invited_by=invited_by,
            expires_at=datetime.utcnow()
            + timedelta(
                hours=InvitationService.INVITATION_EXPIRATION_HOURS
            ),
        )

        db.add(invitation)
        db.commit()
        db.refresh(invitation)

        await EmailService.send_invitation_email(
            to=email,
            token=token
        )
        
        return {
            "message": "Invitation sent successfully",
            "email": email,
        }

    @staticmethod
    def validate_invitation(
        db: Session,
        token: str,
    ):

        invitation = (
            db.query(Invitation)
            .filter(Invitation.token == token)
            .first()
        )

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found"
            )

        if invitation.accepted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation already used"
            )

        if invitation.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation expired"
            )

        return {
            "email": invitation.email,
            "valid": True,
        }

    @staticmethod
    def accept_invitation(
        db: Session,
        token: str,
        fullname: str,
        password: str,
    ):

        invitation = (
            db.query(Invitation)
            .filter(Invitation.token == token)
            .first()
        )

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found"
            )

        if invitation.accepted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation already used"
            )

        if invitation.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation expired"
            )

        existing_user = (
            db.query(User)
            .filter(
                User.email == invitation.email
            )
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )

        user = User(
            fullname=fullname,
            email=invitation.email,
            hashed_password=hash_password(password),
        )

        db.add(user)

        invitation.accepted = True

        db.commit()

        return {
            "message": "Account created successfully"
        }