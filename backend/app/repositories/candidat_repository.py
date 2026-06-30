from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.candidat import Candidat
from app.schemas.identity_extraction import ResumeIdentityRead
from app.models.user import User
from app.schemas.auth import UpdateProfileRequest
from fastapi import HTTPException, status
from passlib.context import CryptContext
 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class CandidatRepository:
    @staticmethod
    def get_by_resume_id(db: Session, resume_id: int) -> Candidat | None:
        return db.query(Candidat).filter(Candidat.resume_id == resume_id).first()

    @staticmethod
    def upsert_from_identity(
        db: Session,
        resume_id: int,
        identity: ResumeIdentityRead,
    ) -> Candidat:
        candidat = CandidatRepository.get_by_resume_id(db, resume_id)

        if candidat is None:
            candidat = Candidat(
                resume_id=resume_id,
                fullname="",
                email="",
                phone="",
            )
            db.add(candidat)

        fullname = identity.name.full_name.strip()
        email = (identity.email.value or "").strip()
        phone = (identity.phone.value or "").strip()

        if fullname:
            candidat.fullname = fullname
        if email:
            candidat.email = email
        if phone:
            candidat.phone = phone

        db.commit()
        db.refresh(candidat)

        return candidat
    
    @staticmethod
    def check_duplicate(
        db: Session,
        email: str,
        phone: str,
        resume_id: int,
    ) -> bool | None:
        filters = []
        if email: 
            filters.append(Candidat.email == email.strip())
        else:
            return None
        if phone:
            filters.append(Candidat.phone == phone.strip())
        else:
            return None
        candidat = db.query(Candidat).filter(or_(*filters)).first()

        if candidat is None:
            return None
        return candidat.resume_id == resume_id

    @staticmethod
    def update_profile(
        db: Session,
        user: User,
        payload: UpdateProfileRequest,
    ) -> User:

        
        if payload.fullname is not None:
            user.fullname = payload.fullname

        if payload.email is not None:
           
            existing = (
                db.query(User)
                .filter(User.email == payload.email, User.id != user.id)
                .first()
            )

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email is already in use.",
                )

            user.email = payload.email

        if payload.avatar is not None:
            user.avatar = payload.avatar

      
        if payload.current_password or payload.new_password:

            if not payload.current_password or not payload.new_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password and new password are required.",
                )

            if not pwd_context.verify(
                payload.current_password,
                user.hashed_password,
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect.",
                )

            user.hashed_password = pwd_context.hash(payload.new_password)
            user.must_change_password = False

        db.commit()
        db.refresh(user)

        return user