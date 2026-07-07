from __future__ import annotations

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import NotificationCreate


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
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="CV téléchargé",
                message=f'"{filename}" a été téléchargé avec succès.',
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def identity_extraction_completed(
        cls, db: Session, *, recruiter_id: int, candidate_name: str
    ) -> Notification:
        subject = candidate_name.strip() or "Le candidat"
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Extraction d'identité terminée",
                message=f"Extraction d'identité terminée avec succès pour {subject}.",
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def identity_extraction_updated(
        cls, db: Session, *, recruiter_id: int, candidate_name: str
    ) -> Notification:
        subject = candidate_name.strip() or "Le candidat"
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Identité mise à jour",
                message=f"Détails d'identité mis à jour avec succès pour {subject}.",
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def resume_analysis_completed(cls, db: Session, *, recruiter_id: int, filename: str) -> Notification:
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Analyse du CV terminée",
                message=f'L’analyse du CV "{filename}" est terminée. Vous pouvez désormais consulter ce CV et évaluer sa compatibilité avec les différents départements.',
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def resume_analysis_failed(
        cls, db: Session, *, recruiter_id: int, filename: str, reason: str
    ) -> Notification:
        safe_reason = reason.strip() or "Le CV n'a pas pu être analysé."
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Analyse du CV échouée",
                message=f'Analyse échouée pour "{filename}" : {safe_reason}',
                type=NotificationType.ERROR,
            ),
        )

    @classmethod
    def duplicate_candidate_detected(
        cls, db: Session, *, recruiter_id: int, message: str
    ) -> Notification:
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Candidat en double détecté",
                message=message,
                type=NotificationType.WARNING,
            ),
        )

    @classmethod
    def candidate_matching_completed(
        cls, db: Session, *, recruiter_id: int, candidate_name: str, match_count: int
    ) -> Notification:
        """Integration hook for the candidate matcher when that workflow is added."""
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Correspondance de candidat terminée",
                message=f"{match_count} opportunité(s) trouvée(s) pour {candidate_name}.",
                type=NotificationType.INFO,
            ),
        )

    @classmethod
    def language_extraction_completed(
        cls, db: Session, *, recruiter_id: int, language_count: int
    ) -> Notification:
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Extraction de langues terminée",
                message=f"{language_count} langue(s) trouvée(s) dans le CV.",
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def language_extraction_failed(
        cls, db: Session, *, recruiter_id: int, reason: str
    ) -> Notification:
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Extraction de langues échouée",
                message=f"Extraction de langues échouée : {reason}",
                type=NotificationType.ERROR,
            ),
        )
