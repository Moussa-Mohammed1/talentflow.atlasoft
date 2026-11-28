from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.candidat_language import CandidatLanguages
from app.models.language import Language
from app.schemas.language_extraction import LanguageMentionRead
from app.services.cv_pipeline.normalizer import CVAttributeNormalizer


class LanguageRepository:
    @staticmethod
    def find_or_create(db: Session, name: str) -> Language:
        clean_name = CVAttributeNormalizer.normalize_language_name(name)
        language = (
            db.query(Language)
            .filter(func.lower(Language.name) == clean_name.casefold())
            .first()
        )
        if not language:
            language = Language(name=clean_name)
            db.add(language)
            db.flush()
        return language

    @staticmethod
    def replace_for_candidate(
        db: Session,
        candidat_id: int,
        languages: list[LanguageMentionRead],
        *,
        normalizer: CVAttributeNormalizer | None = None,
    ) -> list[CandidatLanguages]:
        attr_normalizer = normalizer or CVAttributeNormalizer()
        normalized_langs = attr_normalizer.normalize_languages(languages)

        db.query(CandidatLanguages).filter(
            CandidatLanguages.candidat_id == candidat_id
        ).delete(synchronize_session=False)

        records: list[CandidatLanguages] = []
        seen_language_ids: set[int] = set()
        for item in normalized_langs:
            lang = LanguageRepository.find_or_create(db, item.normalized_name)
            if lang.id in seen_language_ids:
                continue
            seen_language_ids.add(lang.id)
            link = CandidatLanguages(
                candidat_id=candidat_id,
                language_id=lang.id,
                proficiency=item.proficiency,
            )
            db.add(link)
            records.append(link)

        db.commit()
        for record in records:
            db.refresh(record)
        return records
