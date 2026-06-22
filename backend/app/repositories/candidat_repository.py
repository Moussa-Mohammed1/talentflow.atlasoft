from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.schemas.identity_extraction import ResumeIdentityRead


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
