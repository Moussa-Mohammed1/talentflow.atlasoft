import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, Date, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class EmploymentType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    INTERNSHIP = "internship"
    CONTRACT = "contract"
    FREELANCE = "freelance"


class WorkMode(str, Enum):
    ON_SITE = "on_site"
    HYBRID = "hybrid"
    REMOTE = "remote"


class SeniorityLevel(str, Enum):
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"


class JobOfferStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    ARCHIVED = "archived"


class JobOffers(Base):
    __tablename__ = "job_offers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    responsibilities = Column(Text, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    employment_type = Column(SQLEnum(EmploymentType, name="employment_type_enum", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    work_mode = Column(SQLEnum(WorkMode, name="work_mode_enum", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    seniority_level = Column(SQLEnum(SeniorityLevel, name="seniority_level_enum", values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    status = Column(SQLEnum(JobOfferStatus, name="job_offer_status_enum", values_callable=lambda enum: [item.value for item in enum]), nullable=False, default=JobOfferStatus.PUBLISHED)
    openings = Column(Integer, nullable=False, default=1)
    publish_date = Column(Date, nullable=True)
    closing_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
