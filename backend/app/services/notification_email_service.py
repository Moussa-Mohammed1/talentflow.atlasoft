from __future__ import annotations

import asyncio
import logging

from fastapi_mail import FastMail, MessageSchema, MessageType
from sqlalchemy.orm import Session

from app.core.email import conf
from app.models.user import User
from app.models.user_preference import UserPreference

logger = logging.getLogger(__name__)


class NotificationEmailService:

    PREFERENCE_MAP = {
        "new_candidate": "email_new_candidate",
        "invitation_accepted": "email_invitation_accepted",
        "system_updates": "email_system_updates",
    }

    @staticmethod
    def _should_send(db: Session, recruiter_id: int, email_type: str) -> bool:
        pref_field = NotificationEmailService.PREFERENCE_MAP.get(email_type)
        if pref_field is None:
            return False
        prefs = db.query(UserPreference).filter(UserPreference.user_id == recruiter_id).first()
        if prefs is None:
            return False
        return getattr(prefs, pref_field, False)

    @staticmethod
    def send(db: Session, recruiter_id: int, email_type: str, subject: str, body_html: str) -> None:
        if not NotificationEmailService._should_send(db, recruiter_id, email_type):
            logger.debug("User %s has disabled %s emails, skipping", recruiter_id, email_type)
            return

        user = db.query(User).filter(User.id == recruiter_id).first()
        if not user or not user.email:
            logger.warning("No email found for user %s", recruiter_id)
            return

        message = MessageSchema(
            subject=subject,
            recipients=[user.email],
            body=body_html,
            subtype=MessageType.html,
        )
        fm = FastMail(conf)
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(fm.send_message(message))
                logger.info("Email sent to %s for %s", user.email, email_type)
            finally:
                loop.close()
        except Exception:
            logger.exception("Failed to send email to %s for %s", user.email, email_type)
