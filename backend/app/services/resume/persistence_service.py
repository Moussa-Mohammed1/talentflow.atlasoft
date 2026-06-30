from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.repositories.candidat_repository import CandidatRepository
from app.repositories.skill_repository import SkillRepository
from app.repositories.experience_repository import ExperienceRepository
from app.repositories.language_repository import LanguageRepository
from app.schemas.experience_extraction import ResumeExperienceAnalysisRead
from app.schemas.language_extraction import ResumeLanguageAnalysisRead
from app.schemas.skill_extraction import ResumeSkillAnalysisRead


class PersistenceService:
    """Persists extracted resume data to the database."""

    @staticmethod
    def persist_all(
        db: Session,
        candidat_id: int,
        skills: ResumeSkillAnalysisRead,
        experiences: ResumeExperienceAnalysisRead,
        languages: ResumeLanguageAnalysisRead,
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
        return {
            "skills_persisted_count": len(stored_skills),
            "persisted_count": len(stored_exps),
            "languages_persisted_count": len(stored_langs),
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
