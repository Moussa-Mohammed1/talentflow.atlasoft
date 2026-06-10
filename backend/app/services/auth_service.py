from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import os
from app.models.user import User
from app.core.security import (
    verify_password,
    create_access_token
)

EMAIL_SUFFIX = os.getenv("EMAIL_SUFFIX")
PASSWORD_PATTERN= os.getenv("PASSWORD_PATTERN")
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
                detail="Unauthorized origin"
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
                detail="Invalid credentials"
            )

        if not verify_password(
            password,
            user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        token = create_access_token(
            user.id,
            user.role
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "must_change_password":
                user.must_change_password
        }