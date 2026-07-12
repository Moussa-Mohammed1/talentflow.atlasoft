from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.job import JobType
from app.repositories.candidat_repository import CandidatRepository
from app.schemas.skill_extraction import ResumeSkillAnalysisRead
from app.services.resume_extraction.extractor import TextExtractionService, UnsupportedFileTypeError
from app.services.skill_extraction.pipeline import PretrainedBilingualExtractor

from .job_manager import JobManager
from .persistence_service import PersistenceService
from .resume_loader import ResumeLoader
from .skill_mapper import SkillMapper


class ResumeSkillService:
    """Handles skill extraction from resumes."""

    @staticmethod
    def reanalyze(
        db: Session,
        recruiter_id: int,
        resume_id: int,
    ) -> ResumeSkillAnalysisRead:
        resume = ResumeLoader.detail(db, resume_id, recruiter_id)
        jm = JobManager(db, recruiter_id)
        job_id = jm.create(JobType.SKILL_EXTRACTION, resume.path, "Ré-extraction des compétences du CV")

        try:
            jm.start(job_id, "Ré-extraction des compétences du CV")
            raw_text = TextExtractionService().extract(str(ResumeLoader.resolve_path(resume.path)))
            extracted = PretrainedBilingualExtractor(db=db, recruiter_id=recruiter_id).extract_skills(raw_text)
            count = len(extracted.get("technologies", [])) + len(extracted.get("competencies", []))
            jm.complete(job_id, f"{count} compétence(s) trouvée(s)")
        except UnsupportedFileTypeError as e:
            jm.fail(job_id, f"Échec de la ré-extraction des compétences : {str(e)}")
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(e) + ", allowed: pdf, docx")
        except Exception:
            jm.fail(job_id, "Une erreur inattendue s'est produite lors de la ré-extraction des compétences")
            raise

        converted = SkillMapper.convert_skills(extracted)
        analysis = ResumeSkillAnalysisRead.model_validate(converted)

        candidat = CandidatRepository.get_by_resume_id(db, resume.id)
        if candidat is not None:
            PersistenceService.persist_skills(db, candidat.id, analysis)

        return analysis
