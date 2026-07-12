from __future__ import annotations

import logging
from pathlib import Path

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.models.job import JobType
from app.repositories.candidat_repository import CandidatRepository
from app.schemas.identity_extraction import ResumeIdentityRead
from app.services.candidat_service import update_candidat_from_identity
from app.services.identity_extraction.pipeline import ResumeIdentityPipeline
from app.services.resume_extraction.extractor import TextExtractionService, UnsupportedFileTypeError
from app.services.resume_photo_service import ResumePhotoService

from .job_manager import JobManager
from .notification_helper import NotificationHelper
from .resume_loader import ResumeLoader

logger = logging.getLogger(__name__)


class ResumeIdentityService:
    """Handles identity extraction from resumes."""

    @staticmethod
    def extract(
        db: Session,
        recruiter_id: int,
        background_tasks: BackgroundTasks,
        path: str,
    ) -> ResumeIdentityRead:
        resume = ResumeLoader.by_path(db, path, recruiter_id)
        jm = JobManager(db, recruiter_id)
        job_id = jm.create(JobType.IDENTITY_EXTRACTION, resume.path, "Extraction de l'identité du candidat")

        try:
            jm.start(job_id, "Extraction de l'identité du candidat")
            resume_full_path = ResumeLoader.resolve_path(resume.path)
            text = TextExtractionService().extract(str(resume_full_path))
            identity = ResumeIdentityPipeline().analyze(text, db=db, recruiter_id=recruiter_id)
            jm.complete(job_id, "Extraction d'identité terminée")
        except UnsupportedFileTypeError as e:
            jm.fail(job_id, f"Échec de l'extraction d'identité : {str(e)}")
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(e) + ", allowed: pdf, docx")
        except Exception:
            jm.fail(job_id, "Une erreur inattendue s'est produite lors de l'extraction d'identité")
            raise

        validated = ResumeIdentityRead.model_validate(identity)
        email = (validated.email.value or "").strip()
        phone = (validated.phone.value or "").strip()
        duplicate = CandidatRepository.check_duplicate(db, email, phone, resume.id)

        if duplicate is not None:
            if duplicate is False:
                ResumeLoader.delete(db, resume.id, recruiter_id)
                detail = f'Candidat en double : cette identité appartient déjà au CV de "{validated.name.full_name}" ; le nouveau CV a été supprimé.'
            else:
                detail = f"Candidat en double : cette identité est déjà enregistrée pour ce CV de {validated.name.full_name}."
            NotificationHelper.notify_duplicate(background_tasks, db, recruiter_id=recruiter_id, message=detail)
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

        candidat = CandidatRepository.upsert_from_identity(db, resume_id=resume.id, identity=validated)

        photo_path = ResumeIdentityService._extract_photo(resume_full_path, candidat.id)
        if photo_path:
            try:
                candidat.photo = photo_path
                db.commit()
                validated.photo = photo_path
            except Exception as e:
                logger.warning("Failed to save photo path: %s", e)
                db.rollback()

        NotificationHelper.notify_identity_completed(background_tasks, db, recruiter_id=recruiter_id, candidate_name=validated.name.full_name)
        return validated

    @staticmethod
    def reanalyze(
        db: Session,
        recruiter_id: int,
        background_tasks: BackgroundTasks,
        resume_id: int,
    ) -> ResumeIdentityRead:
        resume = ResumeLoader.detail(db, resume_id, recruiter_id)
        jm = JobManager(db, recruiter_id)
        job_id = jm.create(JobType.IDENTITY_EXTRACTION, resume.path, "Ré-extraction de l'identité du candidat")

        try:
            jm.start(job_id, "Ré-extraction de l'identité du candidat")
            resume_full_path = ResumeLoader.resolve_path(resume.path)
            text = TextExtractionService().extract(str(resume_full_path))
            identity = ResumeIdentityPipeline().analyze(text, db=db, recruiter_id=recruiter_id)
            jm.complete(job_id, "Ré-extraction d'identité terminée")
        except UnsupportedFileTypeError as e:
            jm.fail(job_id, f"Échec de la ré-extraction d'identité : {str(e)}")
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(e) + ", allowed: pdf, docx")
        except Exception:
            jm.fail(job_id, "Une erreur inattendue s'est produite lors de la ré-extraction d'identité")
            raise

        validated = ResumeIdentityRead.model_validate(identity)
        email = (validated.email.value or "").strip()
        phone = (validated.phone.value or "").strip()

        if CandidatRepository.check_duplicate(db, email, phone, resume.id):
            candidat = CandidatRepository.get_by_resume_id(db, resume.id)
            update_candidat_from_identity(db, candidat, validated)
            notify = NotificationHelper.notify_identity_updated
        else:
            candidat = Candidat(resume_id=resume.id, fullname="", email="", phone="")
            db.add(candidat)
            update_candidat_from_identity(db, candidat, validated)
            notify = NotificationHelper.notify_identity_completed

        photo_path = ResumeIdentityService._extract_photo(resume_full_path, candidat.id)
        if photo_path:
            try:
                candidat.photo = photo_path
                db.commit()
                validated.photo = photo_path
            except Exception as e:
                logger.warning("Failed to save photo path: %s", e)
                db.rollback()

        notify(background_tasks, db, recruiter_id=recruiter_id, candidate_name=validated.name.full_name)
        return validated

    @staticmethod
    def _extract_photo(resume_path: Path, candidate_id: int) -> str | None:
        try:
            service = ResumePhotoService()
            return service.extract_candidate_photo(resume_path, candidate_id)
        except Exception as e:
            logger.warning("Candidate photo extraction failed: %s", e)
            return None
