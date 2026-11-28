from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.repositories.candidat_repository import CandidatRepository
from app.repositories.certification_repository import CertificationRepository
from app.repositories.education_repository import EducationRepository
from app.repositories.experience_repository import ExperienceRepository
from app.repositories.language_repository import LanguageRepository
from app.repositories.skill_repository import SkillRepository
from app.schemas.certification_extraction import ResumeCertificationAnalysisRead
from app.schemas.cv_pipeline import StructuredCVProfile
from app.schemas.education_extraction import ResumeEducationAnalysisRead
from app.schemas.experience_extraction import ResumeExperienceAnalysisRead
from app.schemas.language_extraction import ResumeLanguageAnalysisRead
from app.schemas.skill_extraction import ResumeSkillAnalysisRead
from app.services.cv_pipeline.normalizer import CVAttributeNormalizer
from app.services.cv_pipeline.spacy_ner import SpacyNERExtractor
from app.services.embeddings.indexer import EmbeddingIndexService

logger = logging.getLogger("talentflow.resume.persistence")


class PersistenceService:
    """Normalizes and persists extracted resume data and embeddings to the database."""

    @staticmethod
    def persist_all(
        db: Session,
        candidat_id: int,
        skills: ResumeSkillAnalysisRead,
        experiences: ResumeExperienceAnalysisRead,
        languages: ResumeLanguageAnalysisRead,
        educations: ResumeEducationAnalysisRead | None = None,
        certifications: ResumeCertificationAnalysisRead | None = None,
        raw_text: str | None = None,
        structured_profile: StructuredCVProfile | None = None,
        generate_embeddings: bool = True,
    ) -> dict[str, Any]:
        normalizer = CVAttributeNormalizer()
        stored_skills = SkillRepository.replace_for_candidate(
            db,
            candidat_id=candidat_id,
            skills=skills.technologies + skills.competencies,
            normalizer=normalizer,
        )
        stored_exps = ExperienceRepository.replace_for_candidate(
            db, candidat_id=candidat_id, experiences=experiences.experiences,
        )
        stored_langs = LanguageRepository.replace_for_candidate(
            db,
            candidat_id=candidat_id,
            languages=languages.languages,
            normalizer=normalizer,
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

        PersistenceService._update_candidate_attributes(
            db,
            candidat_id=candidat_id,
            skills=skills,
            experiences=experiences,
            raw_text=raw_text,
            structured_profile=structured_profile,
            normalizer=normalizer,
        )

        embeddings_count = 0
        if generate_embeddings:
            embeddings_count = PersistenceService._index_candidate_embeddings(db, candidat_id)

        return {
            "skills_persisted_count": len(stored_skills),
            "persisted_count": len(stored_exps),
            "languages_persisted_count": len(stored_langs),
            "educations_persisted_count": len(stored_edus),
            "certifications_persisted_count": len(stored_certs),
            "embeddings_persisted_count": embeddings_count,
        }

    @staticmethod
    def _update_candidate_attributes(
        db: Session,
        *,
        candidat_id: int,
        skills: ResumeSkillAnalysisRead,
        experiences: ResumeExperienceAnalysisRead,
        raw_text: str | None,
        structured_profile: StructuredCVProfile | None,
        normalizer: CVAttributeNormalizer,
    ) -> None:
        candidat = db.query(Candidat).filter(Candidat.id == candidat_id).first()
        if candidat is None:
            return

        if structured_profile is not None:
            attrs = structured_profile.identity
        else:
            ner = SpacyNERExtractor().extract(raw_text or "")
            norm_exps = normalizer.normalize_experiences(experiences.experiences)
            norm_skills = normalizer.normalize_skills(skills.technologies + skills.competencies)
            attrs = normalizer.build_identity_attributes(
                fullname=candidat.fullname,
                email=candidat.email,
                phone=candidat.phone,
                ner=ner,
                experiences=norm_exps,
                skills=norm_skills,
            )

        if attrs.current_role:
            candidat.current_role = attrs.current_role
        if attrs.location:
            candidat.location = attrs.location
        if attrs.total_experience_years is not None:
            candidat.total_experience_years = attrs.total_experience_years
        if attrs.summary:
            candidat.summary = attrs.summary

        db.commit()
        db.refresh(candidat)

    @staticmethod
    def _index_candidate_embeddings(db: Session, candidat_id: int) -> int:
        try:
            records = EmbeddingIndexService().index_candidate(db, candidat_id)
            return len(records)
        except Exception as exc:
            logger.warning("Candidate embedding indexing skipped for candidate_id=%s: %s", candidat_id, exc)
            db.rollback()
            return 0

    @staticmethod
    def get_candidat_or_none(db: Session, resume_id: int):
        return CandidatRepository.get_by_resume_id(db, resume_id)

    @staticmethod
    def persist_skills(
        db: Session,
        candidat_id: int,
        analysis: ResumeSkillAnalysisRead,
    ) -> int:
        stored = SkillRepository.replace_for_candidate(
            db, candidat_id=candidat_id, skills=analysis.technologies + analysis.competencies,
        )
        PersistenceService._index_candidate_embeddings(db, candidat_id)
        return len(stored)

    @staticmethod
    def persist_experiences(
        db: Session,
        candidat_id: int,
        analysis: ResumeExperienceAnalysisRead,
    ) -> int:
        stored = ExperienceRepository.replace_for_candidate(
            db, candidat_id=candidat_id, experiences=analysis.experiences,
        )
        candidat = db.query(Candidat).filter(Candidat.id == candidat_id).first()
        if candidat is not None:
            normalizer = CVAttributeNormalizer()
            candidat.total_experience_years = normalizer.compute_experience_duration_years(analysis.experiences)
            if not candidat.current_role and analysis.experiences:
                candidat.current_role = normalizer.normalize_role(analysis.experiences[0].title)
            db.commit()
        PersistenceService._index_candidate_embeddings(db, candidat_id)
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
        PersistenceService._index_candidate_embeddings(db, candidat_id)
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
        PersistenceService._index_candidate_embeddings(db, candidat_id)
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
        PersistenceService._index_candidate_embeddings(db, candidat_id)
        return len(stored)
