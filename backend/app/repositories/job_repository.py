from __future__ import annotations

from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.job import Job, JobStatus
from app.schemas.job import JobCreate, JobStatusUpdate


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, job_in: JobCreate) -> Job:
        job = Job(
            recruiter_id=job_in.recruiter_id,
            type=job_in.type,
            target=job_in.target,
            message=job_in.message,
            status=JobStatus.PENDING,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_by_id(self, job_id: int, recruiter_id: int) -> Job | None:
        stmt = select(Job).where(Job.id == job_id, Job.recruiter_id == recruiter_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_by_recruiter(self, recruiter_id: int, limit: int = 50, offset: int = 0) -> Sequence[Job]:
        stmt = (
            select(Job)
            .where(Job.recruiter_id == recruiter_id)
            .order_by(Job.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return self.db.execute(stmt).scalars().all()

    def count_running_by_recruiter(self, recruiter_id: int) -> int:
        stmt = select(func.count(Job.id)).where(
            Job.recruiter_id == recruiter_id,
            Job.status == JobStatus.RUNNING,
        )
        return self.db.execute(stmt).scalar_one()

    def update_status(self, job: Job, update_in: JobStatusUpdate) -> Job:
        if update_in.status is not None:
            job.status = update_in.status
        if update_in.message is not None:
            job.message = update_in.message
        if update_in.started_at is not None:
            job.started_at = update_in.started_at
        if update_in.completed_at is not None:
            job.completed_at = update_in.completed_at
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job