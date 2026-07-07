import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class InterviewType(str, Enum):
    ONLINE = "online"
    PHONE = "phone"
    ONSITE = "onsite"


class InterviewStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    recruitment_id = Column(UUID(as_uuid=True), ForeignKey("recruitments.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    interview_type = Column(SQLEnum(InterviewType, name="interview_type_enum", values_callable=lambda enum: [item.value for item in enum]), nullable=False, default=InterviewType.ONLINE)
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    location = Column(String, nullable=True)
    interviewer_name = Column(String, nullable=True)
    status = Column(SQLEnum(InterviewStatus, name="interview_status_enum", values_callable=lambda enum: [item.value for item in enum]), nullable=False, default=InterviewStatus.SCHEDULED)
    feedback = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
