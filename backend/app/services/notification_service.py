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
                title="Resume uploaded",
                message=f'"{filename}" was uploaded successfully.',
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def identity_extraction_completed(
        cls, db: Session, *, recruiter_id: int, candidate_name: str
    ) -> Notification:
        subject = candidate_name.strip() or "The candidate"
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Identity extraction completed",
                message=f"Identity extraction completed successfully for {subject}.",
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def identity_extraction_updated(
        cls, db: Session, *, recruiter_id: int, candidate_name: str
    ) -> Notification:
        subject = candidate_name.strip() or "The candidate"
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Identity updated",
                message=f"Identity details updated successfully for {subject}.",
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def resume_analysis_completed(cls, db: Session, *, recruiter_id: int, filename: str) -> Notification:
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Resume analysis completed",
                message=f'Analysis completed for "{filename}".',
                type=NotificationType.SUCCESS,
            ),
        )

    @classmethod
    def resume_analysis_failed(
        cls, db: Session, *, recruiter_id: int, filename: str, reason: str
    ) -> Notification:
        safe_reason = reason.strip() or "The resume could not be analyzed."
        return cls.create(
            db,
            NotificationCreate(
                recruiter_id=recruiter_id,
                title="Resume analysis failed",
                message=f'Analysis failed for "{filename}": {safe_reason}',
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
                title="Duplicate candidate detected",
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
                title="Candidate matching completed",
                message=f"Found {match_count} matching opportunities for {candidate_name}.",
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
                title="Language extraction completed",
                message=f"Found {language_count} language(s) in the resume.",
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
                title="Language extraction failed",
                message=f"Language extraction failed: {reason}",
                type=NotificationType.ERROR,
            ),
        )
