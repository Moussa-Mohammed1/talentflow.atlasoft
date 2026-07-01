from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobType(str, Enum):
    IDENTITY_EXTRACTION = "identity_extraction"
    RESUME_SCREENING = "resume_screening"
    BULK_DATA_EXPORT = "bulk_data_export"
    CANDIDATE_MATCHING = "candidate_matching"
    SKILL_EXTRACTION = "skill_extraction"
    EXPERIENCE_EXTRACTION = "experience_extraction"
    LANGUAGE_EXTRACTION = "language_extraction"
    EDUCATION_EXTRACTION = "education_extraction"
    CERTIFICATION_EXTRACTION = "certification_extraction"


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        Index(
            "ix_jobs_recruiter_status_created",
            "recruiter_id",
            "status",
            "created_at",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recruiter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[JobType] = mapped_column(
        SQLEnum(
            JobType,
            name="job_type_enum",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )
    target: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        SQLEnum(
            JobStatus,
            name="job_status_enum",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=JobStatus.PENDING,
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )