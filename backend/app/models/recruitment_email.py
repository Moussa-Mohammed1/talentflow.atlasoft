import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class EmailType(str, Enum):
    INTERVIEW_INVITATION = "interview_invitation"
    REMINDER = "reminder"
    OFFER = "offer"
    REJECTION = "rejection"
    CUSTOM = "custom"


class EmailStatus(str, Enum):
    DRAFT = "draft"
    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"


class RecruitmentEmail(Base):
    __tablename__ = "recruitment_emails"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    recruitment_id = Column(UUID(as_uuid=True), ForeignKey("recruitments.id", ondelete="CASCADE"), nullable=False, index=True)
    email_type = Column(SQLEnum(EmailType, name="email_type_enum", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    sender_email = Column(String, nullable=False)
    recipient_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(SQLEnum(EmailStatus, name="email_status_enum", values_callable=lambda enum: [item.value for item in enum]), nullable=False, default=EmailStatus.DRAFT)
    provider_message_id = Column(String, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
