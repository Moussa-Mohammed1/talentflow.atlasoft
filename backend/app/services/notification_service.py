from __future__ import annotations

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType
from app.models.user_preference import UserPreference
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import NotificationCreate


def get_recruiter_language(db: Session, recruiter_id: int) -> str:
    """Return recruiter's preferred UI language ('fr' or 'en'), defaulting to 'fr'."""
    try:
        prefs = db.query(UserPreference).filter(UserPreference.user_id == recruiter_id).first()
        lang = getattr(prefs, "language", "fr") if prefs is not None else "fr"
        return lang if lang in ("fr", "en") else "fr"
    except Exception:
        return "fr"


class NotificationService:
    """Application-level notification use cases and event templates."""

    @staticmethod
    def create(db: Session, payload: NotificationCreate) -> Notification:
        try:
            return NotificationRepository.create(
                db,
                recruiter_id=payload.recruiter_id,
                title=payload.title.strip(),
                message=payload.message.strip(),
                notification_type=payload.type,
            )
        except SQLAlchemyError:
            db.rollback()
            raise

    @classmethod
    def resume_uploaded(cls, db: Session, *, recruiter_id: int, filename: str) -> Notification:
        lang = get_recruiter_language(db, recruiter_id)
        if lang == "en":
            title = "Resume uploaded"
            message = f'"{filename}" was uploaded successfully.'
        else:
            title = "CV téléchargé"
            message = f'"{filename}" a été téléchargé avec succès.'
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title=title,
                message=message,
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def identity_extraction_completed(
        cls, db: Session, *, recruiter_id: int, candidate_name: str
    ) -> Notification:
        lang = get_recruiter_language(db, recruiter_id)
        if lang == "en":
            subject = candidate_name.strip() or "the candidate"
            title = "Identity extraction completed"
            message = f"Identity extraction completed successfully for {subject}."
        else:
            subject = candidate_name.strip() or "Le candidat"
            title = "Extraction d'identité terminée"
            message = f"Extraction d'identité terminée avec succès pour {subject}."
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title=title,
                message=message,
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def identity_extraction_updated(
        cls, db: Session, *, recruiter_id: int, candidate_name: str
    ) -> Notification:
        lang = get_recruiter_language(db, recruiter_id)
        if lang == "en":
            subject = candidate_name.strip() or "the candidate"
            title = "Identity updated"
            message = f"Identity details updated successfully for {subject}."
        else:
            subject = candidate_name.strip() or "Le candidat"
            title = "Identité mise à jour"
            message = f"Détails d'identité mis à jour avec succès pour {subject}."
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title=title,
                message=message,
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def resume_analysis_completed(cls, db: Session, *, recruiter_id: int, filename: str) -> Notification:
        lang = get_recruiter_language(db, recruiter_id)
        if lang == "en":
            title = "Resume analysis completed"
            message = f'Analysis of resume "{filename}" is complete. You can now view this resume and evaluate its compatibility across departments.'
        else:
            title = "Analyse du CV terminée"
            message = f'L’analyse du CV "{filename}" est terminée. Vous pouvez désormais consulter ce CV et évaluer sa compatibilité avec les différents départements.'
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title=title,
                message=message,
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def resume_analysis_failed(
        cls, db: Session, *, recruiter_id: int, filename: str, reason: str
    ) -> Notification:
        lang = get_recruiter_language(db, recruiter_id)
        if lang == "en":
            safe_reason = reason.strip() or "The resume could not be analyzed."
            title = "Resume analysis failed"
            message = f'Analysis failed for "{filename}": {safe_reason}'
        else:
            safe_reason = reason.strip() or "Le CV n'a pas pu être analysé."
            title = "Analyse du CV échouée"
            message = f'Analyse échouée pour "{filename}" : {safe_reason}'
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title=title,
                message=message,
                type=NotificationType.ERROR,
            ),
        )

    @classmethod
    def duplicate_candidate_detected(
        cls, db: Session, *, recruiter_id: int, message: str
    ) -> Notification:
        lang = get_recruiter_language(db, recruiter_id)
        title = "Duplicate candidate detected" if lang == "en" else "Candidat en double détecté"
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title=title,
                message=message,
                type=NotificationType.WARNING,
            ),
        )

    @classmethod
    def candidate_matching_completed(
        cls, db: Session, *, recruiter_id: int, candidate_name: str, match_count: int
    ) -> Notification:
        """Integration hook for the candidate matcher when that workflow is added."""
        lang = get_recruiter_language(db, recruiter_id)
        if lang == "en":
            noun = "match" if match_count == 1 else "matches"
            title = "Candidate matching completed"
            message = f"{match_count} {noun} found for {candidate_name}."
        else:
            title = "Correspondance de candidat terminée"
            message = f"{match_count} opportunité(s) trouvée(s) pour {candidate_name}."
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title=title,
                message=message,
                type=NotificationType.INFO,
            ),
        )

    @classmethod
    def language_extraction_completed(
        cls, db: Session, *, recruiter_id: int, language_count: int
    ) -> Notification:
        lang = get_recruiter_language(db, recruiter_id)
        if lang == "en":
            noun = "language" if language_count == 1 else "languages"
            title = "Language extraction completed"
            message = f"{language_count} {noun} found in the resume."
        else:
            title = "Extraction de langues terminée"
            message = f"{language_count} langue(s) trouvée(s) dans le CV."
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title=title,
                message=message,
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def language_extraction_failed(
        cls, db: Session, *, recruiter_id: int, reason: str
    ) -> Notification:
        lang = get_recruiter_language(db, recruiter_id)
        if lang == "en":
            title = "Language extraction failed"
            message = f"Language extraction failed: {reason}"
        else:
            title = "Extraction de langues échouée"
            message = f"Extraction de langues échouée : {reason}"
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title=title,
                message=message,
                type=NotificationType.ERROR,
            ),
        )
