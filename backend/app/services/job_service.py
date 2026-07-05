from __future__ import annotations

from datetime import datetime
from typing import Sequence

from sqlalchemy.orm import Session

from app.models.job import Job, JobStatus, JobType
from app.repositories.job_repository import JobRepository
from app.schemas.job import JobCreate, JobListRead, JobRead, JobStatusUpdate


class JobService:
    def __init__(self, db: Session):
        self.repo = JobRepository(db)

    def create_job(self, job_in: JobCreate) -> JobRead:
        job = self.repo.create(job_in)
        return JobRead.model_validate(job)

    def list_jobs(self, recruiter_id: int, limit: int = 50, offset: int = 0) -> JobListRead:
        jobs = self.repo.list_by_recruiter(recruiter_id, limit, offset)
        running_count = self.repo.count_running_by_recruiter(recruiter_id)
        return JobListRead(
            items=[JobRead.model_validate(job) for job in jobs],
            running_count=running_count,
        )

    def update_job_status(self, job_id: int, recruiter_id: int, update_in: JobStatusUpdate) -> JobRead | None:
        job = self.repo.get_by_id(job_id, recruiter_id)
        if job is None:
            return None
        updated_job = self.repo.update_status(job, update_in)
        return JobRead.model_validate(updated_job)

    def start_job(self, job_id: int, recruiter_id: int, message: str | None = None) -> JobRead | None:
        return self.update_job_status(
            job_id,
            recruiter_id,
            JobStatusUpdate(
                status=JobStatus.RUNNING,
                message=message,
                started_at=datetime.utcnow(),
            ),
        )

    def complete_job(self, job_id: int, recruiter_id: int, message: str | None = None) -> JobRead | None:
        return self.update_job_status(
            job_id,
            recruiter_id,
            JobStatusUpdate(
                status=JobStatus.COMPLETED,
                message=message,
                completed_at=datetime.utcnow(),
            ),
        )

    def delete_all_jobs(self, recruiter_id: int) -> int:
        return self.repo.delete_all_by_recruiter(recruiter_id)

    def fail_job(self, job_id: int, recruiter_id: int, message: str | None = None) -> JobRead | None:
        return self.update_job_status(
            job_id,
            recruiter_id,
            JobStatusUpdate(
                status=JobStatus.FAILED,
                message=message,
                completed_at=datetime.utcnow(),
            ),
        )