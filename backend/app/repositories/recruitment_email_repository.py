from __future__ import annotations

from datetime import datetime
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.recruitment_email import RecruitmentEmail, EmailStatus


class RecruitmentEmailRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        recruitment_id: UUID,
        email_type: str,
        sender_email: str,
        recipient_email: str,
        subject: str,
        body: str,
        status: str = EmailStatus.DRAFT,
    ) -> RecruitmentEmail:
        email = RecruitmentEmail(
            recruitment_id=recruitment_id,
            email_type=email_type,
            sender_email=sender_email,
            recipient_email=recipient_email,
            subject=subject,
            body=body,
            status=status,
        )
        self.db.add(email)
        self.db.commit()
        self.db.refresh(email)
        return email

    def list_by_recruitment(self, recruitment_id: UUID) -> Sequence[RecruitmentEmail]:
        stmt = (
            select(RecruitmentEmail)
            .where(RecruitmentEmail.recruitment_id == recruitment_id)
            .order_by(RecruitmentEmail.created_at.desc())
        )
        return self.db.execute(stmt).scalars().all()

    def mark_sent(self, email: RecruitmentEmail, provider_message_id: str) -> RecruitmentEmail:
        email.status = EmailStatus.SENT
        email.sent_at = datetime.utcnow()
        email.provider_message_id = provider_message_id
        self.db.add(email)
        self.db.commit()
        self.db.refresh(email)
        return email

    def mark_failed(self, email: RecruitmentEmail) -> RecruitmentEmail:
        email.status = EmailStatus.FAILED
        self.db.add(email)
        self.db.commit()
        self.db.refresh(email)
        return email
