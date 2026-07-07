from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.models.experience import Experience
from app.models.education import Education
from app.models.certification import Certification
from app.schemas.resume import CandidatUpdateSchema, ExperienceUpdateSchema, EducationUpdateSchema, CertificationUpdateSchema

from .resume_loader import ResumeLoader


class ResumeUpdateService:
    """Handles partial updates for resume-related entities."""

    @staticmethod
    def update_candidat(
        db: Session,
        resume_id: int,
        recruiter_id: int,
        payload: CandidatUpdateSchema,
    ) -> dict:
        resume = ResumeLoader.detail(db, resume_id, recruiter_id)
        candidat = db.query(Candidat).filter(Candidat.resume_id == resume.id).first()
        if not candidat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucun candidat trouvé pour ce CV")
        if payload.fullname is not None:
            candidat.fullname = payload.fullname
        if payload.email is not None:
            candidat.email = payload.email
        if payload.phone is not None:
            candidat.phone = payload.phone
        db.commit()
        db.refresh(candidat)
        return {"status": "success", "message": "Candidat mis à jour"}

    @staticmethod
    def update_experience(
        db: Session,
        experience_id: int,
        payload: ExperienceUpdateSchema,
    ) -> dict:
        exp = db.query(Experience).filter(Experience.id == experience_id).first()
        if not exp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expérience introuvable")
        if payload.title is not None:
            exp.title = payload.title
        if payload.description is not None:
            exp.description = payload.description
        if payload.start_date is not None:
            exp.start_date = datetime.strptime(payload.start_date, "%Y-%m-%d") if payload.start_date else None
        if payload.end_date is not None:
            exp.end_date = datetime.strptime(payload.end_date, "%Y-%m-%d") if payload.end_date else None
        db.commit()
        return {"status": "success", "message": "Expérience mise à jour"}

    @staticmethod
    def update_education(
        db: Session,
        education_id: int,
        payload: EducationUpdateSchema,
    ) -> dict:
        edu = db.query(Education).filter(Education.id == education_id).first()
        if not edu:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")
        if payload.institution is not None:
            edu.institution = payload.institution
        if payload.degree is not None:
            edu.degree = payload.degree
        if payload.field_of_study is not None:
            edu.field_of_study = payload.field_of_study
        if payload.start_date is not None:
            edu.start_date = datetime.strptime(payload.start_date, "%Y-%m-%d") if payload.start_date else None
        if payload.end_date is not None:
            edu.end_date = datetime.strptime(payload.end_date, "%Y-%m-%d") if payload.end_date else None
        if payload.description is not None:
            edu.description = payload.description
        db.commit()
        return {"status": "success", "message": "Formation mise à jour"}

    @staticmethod
    def update_certification(
        db: Session,
        certification_id: int,
        payload: CertificationUpdateSchema,
    ) -> dict:
        cert = db.query(Certification).filter(Certification.id == certification_id).first()
        if not cert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certification introuvable")
        if payload.name is not None:
            cert.name = payload.name
        if payload.organization is not None:
            cert.organization = payload.organization
        if payload.issue_date is not None:
            cert.issue_date = datetime.strptime(payload.issue_date, "%Y-%m-%d") if payload.issue_date else None
        if payload.expiration_date is not None:
            cert.expiration_date = datetime.strptime(payload.expiration_date, "%Y-%m-%d") if payload.expiration_date else None
        if payload.credential_id is not None:
            cert.credential_id = payload.credential_id
        if payload.credential_url is not None:
            cert.credential_url = payload.credential_url
        if payload.description is not None:
            cert.description = payload.description
        db.commit()
        return {"status": "success", "message": "Certification mise à jour"}
