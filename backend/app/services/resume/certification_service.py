from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.job import JobType
from app.repositories.candidat_repository import CandidatRepository
from app.schemas.certification_extraction import ResumeCertificationAnalysisRead, ResumeCertificationRead
from app.services.certification_extraction.pipeline import PretrainedBilingualCertificationExtractor
from app.services.resume_extraction.extractor import TextExtractionService, UnsupportedFileTypeError

from .job_manager import JobManager
from .persistence_service import PersistenceService
from .resume_loader import ResumeLoader


class ResumeCertificationService:
    """Handles certification extraction from resumes."""

    @staticmethod
    def extract(
        db: Session,
        recruiter_id: int,
        path: str,
    ) -> ResumeCertificationRead:
        resume = ResumeLoader.by_path(db, path, recruiter_id)
        jm = JobManager(db, recruiter_id)
        job_id = jm.create(JobType.CERTIFICATION_EXTRACTION, Path(resume.path).name, "Extracting certifications from resume")

        try:
            jm.start(job_id, "Extracting certifications from resume")
            raw_text = TextExtractionService().extract(str(ResumeLoader.resolve_path(resume.path)))
            extracted = PretrainedBilingualCertificationExtractor().extract_certifications(raw_text)
            count = len(extracted.get("certifications", []))
            jm.complete(job_id, f"Found {count} certifications")
        except UnsupportedFileTypeError as e:
            jm.fail(job_id, f"Failed to extract certifications: {str(e)}")
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(e) + ", allowed: pdf, docx")

        analysis = ResumeCertificationAnalysisRead.model_validate({
            "sections": extracted.get("sections", []),
            "certifications": extracted.get("certifications", []),
            "stats": extracted.get("stats", {}),
        })

        candidat = CandidatRepository.get_by_resume_id(db, resume.id)
        if candidat is not None:
            persisted = PersistenceService.persist_certifications(db, candidat.id, analysis)
            analysis.stats["persisted_count"] = persisted
        else:
            analysis.stats["persisted_count"] = 0
            analysis.stats["persistence_reason"] = "candidate_identity_not_extracted"

        return ResumeCertificationRead(raw_text=raw_text, analysis=analysis)
