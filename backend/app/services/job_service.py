from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.job import JobStatus
from app.repositories.job_repository import JobRepository
from app.schemas.job import JobCreate, JobListRead, JobRead, JobStatusUpdate
from app.services.notification_manager import notification_manager


def _broadcast_job_update(job_read: JobRead) -> None:
    """Publish durable job state transitions over Redis Pub/Sub / WebSockets."""
    payload = {
        "event": "job.updated",
        "data": job_read.model_dump(mode="json"),
    }
    notification_manager.publish_sync(job_read.recruiter_id, payload)


class JobService:
    def __init__(self, db: Session):
        self.repo = JobRepository(db)

    def create_job(self, job_in: JobCreate, *, broadcast: bool = True) -> JobRead:
        job = self.repo.create(job_in)
        job_read = JobRead.model_validate(job)
        if broadcast:
            _broadcast_job_update(job_read)
        return job_read

    def get_job(self, job_id: int, recruiter_id: int) -> JobRead | None:
        job = self.repo.get_by_id(job_id, recruiter_id)
        if job is None:
            return None
        return JobRead.model_validate(job)

    def list_jobs(self, recruiter_id: int, limit: int = 50, offset: int = 0) -> JobListRead:
        jobs = self.repo.list_by_recruiter(recruiter_id, limit, offset)
        running_count = self.repo.count_running_by_recruiter(recruiter_id)
        return JobListRead(
            items=[JobRead.model_validate(job) for job in jobs],
            running_count=running_count,
        )

    def update_job_status(
        self,
        job_id: int,
        recruiter_id: int,
        update_in: JobStatusUpdate,
        *,
        broadcast: bool = True,
    ) -> JobRead | None:
        job = self.repo.get_by_id(job_id, recruiter_id)
        if job is None:
            return None
        updated_job = self.repo.update_status(job, update_in)
        job_read = JobRead.model_validate(updated_job)
        if broadcast:
            _broadcast_job_update(job_read)
        return job_read

    def attach_celery_task(
        self,
        job_id: int,
        recruiter_id: int,
        celery_task_id: str,
        queue_name: str | None = None,
    ) -> JobRead | None:
        job = self.repo.get_by_id(job_id, recruiter_id)
        if job is None:
            return None
        if queue_name:
            job.queue_name = queue_name
        updated = self.repo.update_status(
            job,
            JobStatusUpdate(status=job.status, celery_task_id=celery_task_id),
        )
        return JobRead.model_validate(updated)

    def start_job(
        self,
        job_id: int,
        recruiter_id: int,
        message: str | None = None,
        *,
        current_step: str | None = None,
        progress: int = 5,
    ) -> JobRead | None:
        return self.update_job_status(
            job_id,
            recruiter_id,
            JobStatusUpdate(
                status=JobStatus.RUNNING,
                message=message,
                current_step=current_step,
                progress=progress,
                started_at=datetime.now(UTC),
            ),
        )

    def set_progress(
        self,
        job_id: int,
        recruiter_id: int,
        *,
        progress: int,
        current_step: str,
        message: str | None = None,
    ) -> JobRead | None:
        return self.update_job_status(
            job_id,
            recruiter_id,
            JobStatusUpdate(
                status=JobStatus.RUNNING,
                progress=max(0, min(100, progress)),
                current_step=current_step,
                message=message,
            ),
        )

    def record_retry(
        self,
        job_id: int,
        recruiter_id: int,
        *,
        retries: int,
        error_details: str,
        message: str | None = None,
    ) -> JobRead | None:
        return self.update_job_status(
            job_id,
            recruiter_id,
            JobStatusUpdate(
                status=JobStatus.PENDING,
                retries=retries,
                error_details=error_details,
                message=message or f"Retry #{retries} scheduled",
                current_step="retrying",
            ),
        )

    def complete_job(
        self,
        job_id: int,
        recruiter_id: int,
        message: str | None = None,
        *,
        result_payload: dict[str, Any] | None = None,
        current_step: str = "completed",
    ) -> JobRead | None:
        return self.update_job_status(
            job_id,
            recruiter_id,
            JobStatusUpdate(
                status=JobStatus.COMPLETED,
                message=message,
                progress=100,
                current_step=current_step,
                result_payload=result_payload,
                completed_at=datetime.now(UTC),
            ),
        )

    def delete_all_jobs(self, recruiter_id: int) -> int:
        return self.repo.delete_all_by_recruiter(recruiter_id)

    def fail_job(
        self,
        job_id: int,
        recruiter_id: int,
        message: str | None = None,
        *,
        error_details: str | None = None,
        retries: int | None = None,
    ) -> JobRead | None:
        return self.update_job_status(
            job_id,
            recruiter_id,
            JobStatusUpdate(
                status=JobStatus.FAILED,
                message=message,
                error_details=error_details or message,
                retries=retries,
                current_step="failed",
                completed_at=datetime.now(UTC),
            ),
        )
