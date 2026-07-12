from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.job import JobType
from app.repositories.candidat_repository import CandidatRepository
from app.schemas.experience_extraction import ResumeExperienceAnalysisRead, ResumeExperienceRead
from app.services.experience_extraction.pipeline import PretrainedBilingualExperienceExtractor
from app.services.resume_extraction.extractor import TextExtractionService, UnsupportedFileTypeError

from .job_manager import JobManager
from .persistence_service import PersistenceService
from .resume_loader import ResumeLoader


class ResumeExperienceService:
    """Handles experience extraction from resumes."""

    @staticmethod
    def reanalyze(
        db: Session,
        recruiter_id: int,
        resume_id: int,
    ) -> ResumeExperienceRead:
        resume = ResumeLoader.detail(db, resume_id, recruiter_id)
        jm = JobManager(db, recruiter_id)
        job_id = jm.create(JobType.EXPERIENCE_EXTRACTION, Path(resume.path).name, "Ré-extraction des expériences du CV")

        try:
            jm.start(job_id, "Ré-extraction des expériences du CV")
            raw_text = TextExtractionService().extract(str(ResumeLoader.resolve_path(resume.path)))
            extracted = PretrainedBilingualExperienceExtractor(db=db, recruiter_id=recruiter_id).extract_experiences(raw_text)
            count = len(extracted.get("experiences", []))
            jm.complete(job_id, f"{count} expérience(s) trouvée(s)")
        except UnsupportedFileTypeError as e:
            jm.fail(job_id, f"Échec de la ré-extraction des expériences : {str(e)}")
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(e) + ", allowed: pdf, docx")
        except Exception:
            jm.fail(job_id, "Une erreur inattendue s'est produite lors de la ré-extraction des expériences")
            raise

        analysis = ResumeExperienceAnalysisRead.model_validate({
            "sections": extracted.get("sections", []),
            "experiences": extracted.get("experiences", []),
            "stats": extracted.get("stats", {}),
        })

        candidat = CandidatRepository.get_by_resume_id(db, resume.id)
        if candidat is not None:
            persisted = PersistenceService.persist_experiences(db, candidat.id, analysis)
            analysis.stats["persisted_count"] = persisted
        else:
            analysis.stats["persisted_count"] = 0
            analysis.stats["persistence_reason"] = "candidate_identity_not_extracted"

        return ResumeExperienceRead(raw_text=raw_text, analysis=analysis)

    @staticmethod
    def extract(
        db: Session,
        recruiter_id: int,
        path: str,
    ) -> ResumeExperienceRead:
        resume = ResumeLoader.by_path(db, path, recruiter_id)
        jm = JobManager(db, recruiter_id)
        job_id = jm.create(JobType.EXPERIENCE_EXTRACTION, Path(resume.path).name, "Extraction des expériences du CV")

        try:
            jm.start(job_id, "Extraction des expériences du CV")
            raw_text = TextExtractionService().extract(str(ResumeLoader.resolve_path(resume.path)))
            extracted = PretrainedBilingualExperienceExtractor(db=db, recruiter_id=recruiter_id).extract_experiences(raw_text)
            count = len(extracted.get("experiences", []))
            jm.complete(job_id, f"{count} expérience(s) trouvée(s)")
        except UnsupportedFileTypeError as e:
            jm.fail(job_id, f"Échec de l'extraction des expériences : {str(e)}")
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(e) + ", allowed: pdf, docx")
        except Exception:
            jm.fail(job_id, "Une erreur inattendue s'est produite lors de l'extraction des expériences")
            raise

        analysis = ResumeExperienceAnalysisRead.model_validate({
            "sections": extracted.get("sections", []),
            "experiences": extracted.get("experiences", []),
            "stats": extracted.get("stats", {}),
        })

        candidat = CandidatRepository.get_by_resume_id(db, resume.id)
        if candidat is not None:
            persisted = PersistenceService.persist_experiences(db, candidat.id, analysis)
            analysis.stats["persisted_count"] = persisted
        else:
            analysis.stats["persisted_count"] = 0
            analysis.stats["persistence_reason"] = "candidate_identity_not_extracted"

        return ResumeExperienceRead(raw_text=raw_text, analysis=analysis)
