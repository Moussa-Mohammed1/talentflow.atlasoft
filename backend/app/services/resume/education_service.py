from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.job import JobType
from app.repositories.candidat_repository import CandidatRepository
from app.schemas.education_extraction import ResumeEducationAnalysisRead, ResumeEducationRead
from app.services.education_extraction.pipeline import PretrainedBilingualEducationExtractor
from app.services.resume_extraction.extractor import TextExtractionService, UnsupportedFileTypeError

from .job_manager import JobManager
from .persistence_service import PersistenceService
from .resume_loader import ResumeLoader


class ResumeEducationService:
    """Handles education extraction from resumes."""

    @staticmethod
    def extract(
        db: Session,
        recruiter_id: int,
        path: str,
    ) -> ResumeEducationRead:
        resume = ResumeLoader.by_path(db, path, recruiter_id)
        jm = JobManager(db, recruiter_id)
        job_id = jm.create(JobType.EDUCATION_EXTRACTION, Path(resume.path).name, "Extraction des formations du CV")

        try:
            jm.start(job_id, "Extraction des formations du CV")
            resume_path = str(ResumeLoader.resolve_path(resume.path))
            raw_text = TextExtractionService().extract(resume_path)
            extracted = PretrainedBilingualEducationExtractor().extract_education(resume_path, raw_text)
            count = len(extracted.get("educations", []))
            jm.complete(job_id, f"{count} formation(s) trouvée(s)")
        except UnsupportedFileTypeError as e:
            jm.fail(job_id, f"Échec de l'extraction des formations : {str(e)}")
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(e) + ", allowed: pdf, docx")

        analysis = ResumeEducationAnalysisRead.model_validate({
            "sections": extracted.get("sections", []),
            "educations": extracted.get("educations", []),
            "stats": extracted.get("stats", {}),
        })

        candidat = CandidatRepository.get_by_resume_id(db, resume.id)
        if candidat is not None:
            persisted = PersistenceService.persist_educations(db, candidat.id, analysis)
            analysis.stats["persisted_count"] = persisted
        else:
            analysis.stats["persisted_count"] = 0
            analysis.stats["persistence_reason"] = "candidate_identity_not_extracted"

        return ResumeEducationRead(raw_text=raw_text, analysis=analysis)
