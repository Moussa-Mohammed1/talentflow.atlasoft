import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class RecruitmentStatus(str, Enum):
    PENDING = "pending"
    INTERVIEW_INVITATION_SENT = "interview_invitation_sent"
    INTERVIEW_CONFIRMED = "interview_confirmed"
    INTERVIEW_COMPLETED = "interview_completed"
    OFFER_SENT = "offer_sent"
    OFFER_ACCEPTED = "offer_accepted"
    OFFER_REJECTED = "offer_rejected"
    CANDIDATE_DECLINED = "candidate_declined"
    HIRED = "hired"
    CANCELLED = "cancelled"


class RecruitmentPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Recruitment(Base):
    __tablename__ = "recruitments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    candidate_id = Column(Integer, ForeignKey("candidats.id", ondelete="CASCADE"), nullable=False, index=True)
    job_offer_id = Column(UUID(as_uuid=True), ForeignKey("job_offers.id", ondelete="CASCADE"), nullable=False, index=True)
    compatibility_score = Column(Numeric(5, 2), nullable=True)
    status = Column(SQLEnum(RecruitmentStatus, name="recruitment_status_enum", values_callable=lambda enum: [item.value for item in enum]), nullable=False, default=RecruitmentStatus.PENDING)
    priority = Column(SQLEnum(RecruitmentPriority, name="recruitment_priority_enum", values_callable=lambda enum: [item.value for item in enum]), nullable=False, default=RecruitmentPriority.MEDIUM)
    assigned_recruiter_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
