from __future__ import annotations

import logging

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.services.notification_email_service import NotificationEmailService
from app.services.notification_manager import notification_manager
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class NotificationHelper:
    """Centralized notification creation with safe broadcasting and email sending."""

    @staticmethod
    def _queue(background_tasks: BackgroundTasks, notification) -> None:
        background_tasks.add_task(notification_manager.broadcast, notification)

    @staticmethod
    def _safe(background_tasks: BackgroundTasks, factory, *args, **kwargs) -> None:
        try:
            notification = factory(*args, **kwargs)
        except Exception:
            logger.exception("Could not create notification")
            return
        background_tasks.add_task(notification_manager.broadcast, notification)

    @staticmethod
    def _send_email(
        db: Session,
        recruiter_id: int,
        email_type: str,
        subject: str,
        body_html: str,
    ) -> None:
        try:
            NotificationEmailService.send(db, recruiter_id, email_type, subject, body_html)
        except Exception:
            logger.exception("Could not send notification email")

    @classmethod
    def notify_upload(cls, background_tasks: BackgroundTasks, db: Session, recruiter_id: int, filename: str) -> None:
        cls._safe(background_tasks, NotificationService.resume_uploaded, db, recruiter_id=recruiter_id, filename=filename)
        subject = "Nouveau CV importé"
        body = f"<p>Bonjour,</p><p>Le CV <strong>{filename}</strong> a été téléchargé avec succès sur TalentFlow.</p><p>Vous pouvez dès à présent vérifier les informations extraites et lancer une évaluation.</p><p>Cordialement,<br>L'équipe TalentFlow</p>"
        cls._send_email(db, recruiter_id, "new_candidate", subject, body)

    @classmethod
    def notify_analysis_completed(cls, background_tasks: BackgroundTasks, db: Session, recruiter_id: int, filename: str) -> None:
        cls._safe(background_tasks, NotificationService.resume_analysis_completed, db, recruiter_id=recruiter_id, filename=filename)
        subject = "Analyse de CV terminée"
        body = f"<p>Bonjour,</p><p>L'analyse du CV <strong>{filename}</strong> est terminée.</p><p>Vous pouvez maintenant consulter les résultats et évaluer la compatibilité du candidat avec les différents départements.</p><p>Cordialement,<br>L'équipe TalentFlow</p>"
        cls._send_email(db, recruiter_id, "new_candidate", subject, body)

    @classmethod
    def notify_analysis_failed(cls, background_tasks: BackgroundTasks, db: Session, recruiter_id: int, filename: str, reason: str) -> None:
        cls._safe(background_tasks, NotificationService.resume_analysis_failed, db, recruiter_id=recruiter_id, filename=filename, reason=reason)
        subject = "Échec de l'analyse du CV"
        body = f"<p>Bonjour,</p><p>L'analyse du CV <strong>{filename}</strong> a échoué.</p><p>Raison : {reason}</p><p>Veuillez réessayer ou contacter le support si le problème persiste.</p><p>Cordialement,<br>L'équipe TalentFlow</p>"
        cls._send_email(db, recruiter_id, "new_candidate", subject, body)

    @classmethod
    def notify_identity_completed(cls, background_tasks: BackgroundTasks, db: Session, recruiter_id: int, candidate_name: str) -> None:
        cls._safe(background_tasks, NotificationService.identity_extraction_completed, db, recruiter_id=recruiter_id, candidate_name=candidate_name)

    @classmethod
    def notify_identity_updated(cls, background_tasks: BackgroundTasks, db: Session, recruiter_id: int, candidate_name: str) -> None:
        cls._safe(background_tasks, NotificationService.identity_extraction_updated, db, recruiter_id=recruiter_id, candidate_name=candidate_name)

    @classmethod
    def notify_duplicate(cls, background_tasks: BackgroundTasks, db: Session, recruiter_id: int, message: str) -> None:
        cls._safe(background_tasks, NotificationService.duplicate_candidate_detected, db, recruiter_id=recruiter_id, message=message)

    @classmethod
    def notify_language_completed(cls, background_tasks: BackgroundTasks, db: Session, recruiter_id: int, language_count: int) -> None:
        cls._safe(background_tasks, NotificationService.language_extraction_completed, db, recruiter_id=recruiter_id, language_count=language_count)
