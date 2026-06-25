from sqlalchemy.orm import Session

from app.models.candidat_language import CandidatLanguages
from app.models.language import Language
from app.schemas.language_extraction import LanguageMentionRead


class LanguageRepository:
    @staticmethod
    def find_or_create(db: Session, name: str) -> Language:
        language = db.query(Language).filter(Language.name == name).first()
        if not language:
            language = Language(name=name)
            db.add(language)
            db.flush()
        return language

    @staticmethod
    def replace_for_candidate(
        db: Session,
        candidat_id: int,
        languages: list[LanguageMentionRead],
    ) -> list[CandidatLanguages]:
        db.query(CandidatLanguages).filter(
            CandidatLanguages.candidat_id == candidat_id
        ).delete(synchronize_session=False)

        records = []
        for item in languages:
            lang = LanguageRepository.find_or_create(db, item.language)
            link = CandidatLanguages(
                candidat_id=candidat_id,
                language_id=lang.id,
                proficiency=item.proficiency.level if item.proficiency else None,
            )
            db.add(link)
            records.append(link)

        db.commit()
        for record in records:
            db.refresh(record)
        return records
