from __future__ import annotations

import logging
from enum import Enum
from pathlib import Path

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.experience_extraction import ResumeExperienceAnalysisRead
from app.schemas.language_extraction import ResumeLanguageAnalysisRead
from app.schemas.skill_extraction import ResumeAnalysisRead, ResumeSkillAnalysisRead
from app.schemas.education_extraction import ResumeEducationAnalysisRead
from app.schemas.certification_extraction import ResumeCertificationAnalysisRead
from app.services.experience_extraction.pipeline import PretrainedBilingualExperienceExtractor
from app.services.education_extraction.pipeline import PretrainedBilingualEducationExtractor
from app.services.language_extraction.pipeline import ResumeLanguageExtractionPipeline
from app.services.resume_extraction.extractor import TextExtractionService, UnsupportedFileTypeError
from app.services.skill_extraction.pipeline import PretrainedBilingualExtractor
from app.services.certification_extraction.pipeline import PretrainedBilingualCertificationExtractor

from .job_manager import AnalysisJobs, JobManager
from .notification_helper import NotificationHelper
from .persistence_service import PersistenceService
from .resume_loader import ResumeLoader
from .skill_mapper import SkillMapper

logger = logging.getLogger(__name__)


class ResumeLookup(Enum):
    PATH = "path"
    ID = "id"


class ResumeAnalysisWorkflow:
    """Orchestrates the full resume analysis pipeline (skills + experience + languages)."""

    def __init__(
        self,
        db: Session,
        recruiter_id: int,
        background_tasks: BackgroundTasks,
        lookup_type: ResumeLookup,
        lookup_value: str | int,
        require_candidat: bool = False,
    ):
        self.db = db
        self.recruiter_id = recruiter_id
        self.background_tasks = background_tasks
        self.lookup_type = lookup_type
        self.lookup_value = lookup_value
        self.require_candidat = require_candidat
        self._resume = None
        self._resume_path = ""
        self._raw_text = ""
        self._converted_skills: dict = {}
        self._skill_analysis: ResumeSkillAnalysisRead | None = None
        self._experience_analysis: ResumeExperienceAnalysisRead | None = None
        self._language_analysis: ResumeLanguageAnalysisRead | None = None
        self._education_analysis: ResumeEducationAnalysisRead | None = None
        self._certification_analysis: ResumeCertificationAnalysisRead | None = None
        self._persistence_stats: dict | None = None
        self._jobs: AnalysisJobs | None = None

    @property
    def _filename(self) -> str:
        return Path(self._resume.path).name if self._resume else "unknown"

    def _load_resume(self):
        if self.lookup_type == ResumeLookup.PATH:
            self._resume = ResumeLoader.by_path(self.db, str(self.lookup_value), self.recruiter_id)
        else:
            self._resume = ResumeLoader.by_id(self.db, int(self.lookup_value), self.recruiter_id)

    def _create_and_start_jobs(self):
        jm = JobManager(self.db, self.recruiter_id)
        self._jobs = jm.create_analysis_jobs(self._filename)
        jm.start_analysis_jobs(self._jobs)

    def _extract_text(self):
        self._resume_path = str(ResumeLoader.resolve_path(self._resume.path))
        self._raw_text = TextExtractionService().extract(self._resume_path)

    def _extract_skills(self):
        result = PretrainedBilingualExtractor().extract_skills(self._raw_text)
        count = len(result.get("technologies", [])) + len(result.get("competencies", []))
        JobManager(self.db, self.recruiter_id).complete_skills(self._jobs.skill_id, count)
        self._converted_skills = SkillMapper.convert_skills(result)

    def _extract_experiences(self):
        result = PretrainedBilingualExperienceExtractor().extract_experiences(self._raw_text)
        count = len(result.get("experiences", []))
        JobManager(self.db, self.recruiter_id).complete_experiences(self._jobs.experience_id, count)
        self._experience_analysis = ResumeExperienceAnalysisRead.model_validate({
            "sections": result.get("sections", []),
            "experiences": result.get("experiences", []),
            "stats": result.get("stats", {}),
        })

    def _extract_languages(self):
        result = ResumeLanguageExtractionPipeline().extract_languages(self._raw_text)
        count = len(result.get("languages", []))
        JobManager(self.db, self.recruiter_id).complete_languages(self._jobs.language_id, count)
        self._language_analysis = ResumeLanguageAnalysisRead.model_validate({
            "sections": result.get("sections", []),
            "languages": result.get("languages", []),
            "stats": result.get("stats", {}),
        })

    def _extract_educations(self):
        result = PretrainedBilingualEducationExtractor().extract_education(self._resume_path, self._raw_text)
        count = len(result.get("educations", []))
        JobManager(self.db, self.recruiter_id).complete_educations(self._jobs.education_id, count)
        self._education_analysis = ResumeEducationAnalysisRead.model_validate({
            "sections": result.get("sections", []),
            "educations": result.get("educations", []),
            "stats": result.get("stats", {}),
        })

    def _extract_certifications(self):
        result = PretrainedBilingualCertificationExtractor().extract_certifications(self._raw_text)
        count = len(result.get("certifications", []))
        JobManager(self.db, self.recruiter_id).complete_certifications(self._jobs.certification_id, count)
        self._certification_analysis = ResumeCertificationAnalysisRead.model_validate({
            "sections": result.get("sections", []),
            "certifications": result.get("certifications", []),
            "stats": result.get("stats", {}),
        })

    def _persist(self):
        self._skill_analysis = ResumeSkillAnalysisRead.model_validate(self._converted_skills)
        candidat = PersistenceService.get_candidat_or_none(self.db, self._resume.id)

        if candidat is None:
            if self.require_candidat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Aucun candidat associé à ce CV. Veuillez d'abord extraire l'identité.",
                )
            self._persistence_stats = {
                "skills_persisted_count": 0,
                "persisted_count": 0,
                "languages_persisted_count": 0,
                "educations_persisted_count": 0,
                "persistence_reason": "candidate_identity_not_extracted",
            }
            return

        self._persistence_stats = PersistenceService.persist_all(
            self.db, candidat.id, self._skill_analysis, self._experience_analysis, self._language_analysis,
            educations=self._education_analysis,
            certifications=self._certification_analysis,
        )

    def _build_response(self) -> ResumeAnalysisRead:
        if self._persistence_stats:
            self._experience_analysis.stats.update(self._persistence_stats)
        return ResumeAnalysisRead(
            raw_text=self._raw_text,
            analysis=ResumeSkillAnalysisRead.model_validate(self._converted_skills),
            experience=self._experience_analysis.model_dump(),
            languages=self._language_analysis.model_dump(),
            educations=self._education_analysis.model_dump() if self._education_analysis else None,
            certifications=self._certification_analysis.model_dump() if self._certification_analysis else None,
        )

    def execute(self) -> ResumeAnalysisRead:
        try:
            self._load_resume()
            self._create_and_start_jobs()
            self._extract_text()
            self._extract_skills()
            self._extract_experiences()
            self._extract_educations()
            self._extract_certifications()
            self._extract_languages()
            self._persist()
            NotificationHelper.notify_analysis_completed(
                self.background_tasks, self.db, recruiter_id=self.recruiter_id, filename=self._filename,
            )
            return self._build_response()
        except UnsupportedFileTypeError as e:
            NotificationHelper.notify_analysis_failed(
                self.background_tasks, self.db, recruiter_id=self.recruiter_id, filename=self._filename, reason=str(e),
            )
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(e) + ", allowed: pdf, docx")
        except HTTPException:
            NotificationHelper.notify_analysis_failed(
                self.background_tasks, self.db, recruiter_id=self.recruiter_id, filename=self._filename, reason="L'analyse a échoué",
            )
            raise
        except Exception:
            logger.exception("Resume analysis failed for resume %s", getattr(self._resume, "id", "unknown"))
            NotificationHelper.notify_analysis_failed(
                self.background_tasks, self.db, recruiter_id=self.recruiter_id, filename=self._filename, reason="Une erreur de traitement inattendue s'est produite.",
            )
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="L'analyse du CV a échoué")
