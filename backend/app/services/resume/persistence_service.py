from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.repositories.candidat_repository import CandidatRepository
from app.repositories.skill_repository import SkillRepository
from app.repositories.experience_repository import ExperienceRepository
from app.repositories.language_repository import LanguageRepository
from app.repositories.education_repository import EducationRepository
from app.repositories.certification_repository import CertificationRepository
from app.schemas.experience_extraction import ResumeExperienceAnalysisRead
from app.schemas.language_extraction import ResumeLanguageAnalysisRead
from app.schemas.skill_extraction import ResumeSkillAnalysisRead
from app.schemas.education_extraction import ResumeEducationAnalysisRead
from app.schemas.certification_extraction import ResumeCertificationAnalysisRead


class PersistenceService:
    """Persists extracted resume data to the database."""

    @staticmethod
    def persist_all(
        db: Session,
        candidat_id: int,
        skills: ResumeSkillAnalysisRead,
        experiences: ResumeExperienceAnalysisRead,
        languages: ResumeLanguageAnalysisRead,
        educations: ResumeEducationAnalysisRead | None = None,
        certifications: ResumeCertificationAnalysisRead | None = None,
    ) -> dict[str, Any]:
        stored_skills = SkillRepository.replace_for_candidate(
            db, candidat_id=candidat_id, skills=skills.technologies + skills.competencies,
        )
        stored_exps = ExperienceRepository.replace_for_candidate(
            db, candidat_id=candidat_id, experiences=experiences.experiences,
        )
        stored_langs = LanguageRepository.replace_for_candidate(
            db, candidat_id=candidat_id, languages=languages.languages,
        )
        stored_edus = []
        if educations is not None:
            stored_edus = EducationRepository.replace_for_candidate(
                db, candidat_id=candidat_id, educations=educations.educations,
            )
        stored_certs = []
        if certifications is not None:
            stored_certs = CertificationRepository.replace_for_candidate(
                db, candidat_id=candidat_id, certifications=certifications.certifications,
            )
        return {
            "skills_persisted_count": len(stored_skills),
            "persisted_count": len(stored_exps),
            "languages_persisted_count": len(stored_langs),
            "educations_persisted_count": len(stored_edus),
            "certifications_persisted_count": len(stored_certs),
        }

    @staticmethod
    def get_candidat_or_none(db: Session, resume_id: int):
        return CandidatRepository.get_by_resume_id(db, resume_id)

    @staticmethod
    def persist_experiences(
        db: Session,
        candidat_id: int,
        analysis: ResumeExperienceAnalysisRead,
    ) -> int:
        stored = ExperienceRepository.replace_for_candidate(
            db, candidat_id=candidat_id, experiences=analysis.experiences,
        )
        return len(stored)

    @staticmethod
    def persist_languages(
        db: Session,
        candidat_id: int,
        analysis: ResumeLanguageAnalysisRead,
    ) -> int:
        stored = LanguageRepository.replace_for_candidate(
            db, candidat_id=candidat_id, languages=analysis.languages,
        )
        return len(stored)

    @staticmethod
    def persist_certifications(
        db: Session,
        candidat_id: int,
        analysis: ResumeCertificationAnalysisRead,
    ) -> int:
        stored = CertificationRepository.replace_for_candidate(
            db, candidat_id=candidat_id, certifications=analysis.certifications,
        )
        return len(stored)

    @staticmethod
    def persist_educations(
        db: Session,
        candidat_id: int,
        analysis: ResumeEducationAnalysisRead,
    ) -> int:
        stored = EducationRepository.replace_for_candidate(
            db, candidat_id=candidat_id, educations=analysis.educations,
        )
        return len(stored)
