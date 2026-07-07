from __future__ import annotations

from pathlib import Path

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.models.job import JobType
from app.repositories.candidat_repository import CandidatRepository
from app.schemas.language_extraction import ResumeLanguageAnalysisRead, ResumeLanguageRead
from app.services.language_extraction.pipeline import ResumeLanguageExtractionPipeline
from app.services.resume_extraction.extractor import TextExtractionService, UnsupportedFileTypeError

from .job_manager import JobManager
from .notification_helper import NotificationHelper
from .persistence_service import PersistenceService
from .resume_loader import ResumeLoader


class ResumeLanguageService:
    """Handles language extraction from resumes."""

    @staticmethod
    def extract(
        db: Session,
        recruiter_id: int,
        background_tasks: BackgroundTasks,
        path: str,
    ) -> ResumeLanguageRead:
        resume = ResumeLoader.by_path(db, path, recruiter_id)
        jm = JobManager(db, recruiter_id)
        job_id = jm.create(JobType.LANGUAGE_EXTRACTION, Path(resume.path).name, "Extraction des langues du CV")

        try:
            jm.start(job_id, "Extraction des langues du CV")
            raw_text = TextExtractionService().extract(str(ResumeLoader.resolve_path(resume.path)))
            extracted = ResumeLanguageExtractionPipeline().extract_languages(raw_text)
            lang_count = len(extracted.get("languages", []))
            jm.complete(job_id, f"{lang_count} langue(s) trouvée(s)")
        except UnsupportedFileTypeError as e:
            jm.fail(job_id, f"Échec de l'extraction des langues : {str(e)}")
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(e) + ", allowed: pdf, docx")

        analysis = ResumeLanguageAnalysisRead.model_validate({
            "sections": extracted.get("sections", []),
            "languages": extracted.get("languages", []),
            "stats": extracted.get("stats", {}),
        })

        candidat = CandidatRepository.get_by_resume_id(db, resume.id)
        if candidat is not None:
            persisted = PersistenceService.persist_languages(db, candidat.id, analysis)
            analysis.stats["persisted_count"] = persisted
        else:
            analysis.stats["persisted_count"] = 0
            analysis.stats["persistence_reason"] = "candidate_identity_not_extracted"

        NotificationHelper.notify_language_completed(background_tasks, db, recruiter_id=recruiter_id, language_count=lang_count)
        return ResumeLanguageRead(raw_text=raw_text, analysis=analysis)
