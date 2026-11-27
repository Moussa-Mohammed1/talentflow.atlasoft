from __future__ import annotations

import logging
from typing import Any, Callable

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job import JobType
from app.schemas.job import JobAcceptedResponse, JobCreate
from app.services.job_service import JobService
from app.workers.celery_app import celery_app

logger = logging.getLogger("talentflow.workers.dispatcher")


def should_use_celery_broker() -> bool:
    return bool(
        (settings.redis_url or "").strip()
        or (settings.celery_broker_url or "").strip()
        or settings.celery_task_always_eager
    )


def dispatch_background_job(
    db: Session,
    background_tasks: BackgroundTasks | None,
    *,
    recruiter_id: int,
    job_type: JobType,
    target: str,
    task_name: str,
    queue_name: str,
    task_kwargs: dict[str, Any],
    fallback_fn: Callable[..., Any] | None = None,
    max_retries: int = 3,
    initial_message: str | None = None,
) -> JobAcceptedResponse:
    """Create a durable PostgreSQL job row first, then dispatch via Celery (or local fallback)."""
    job_svc = JobService(db)
    job = job_svc.create_job(
        JobCreate(
            recruiter_id=recruiter_id,
            type=job_type,
            target=target[:255],
            queue_name=queue_name,
            max_retries=max_retries,
            current_step="queued",
            message=initial_message or "Task queued for background processing",
        )
    )

    payload_kwargs = {
        **task_kwargs,
        "job_id": job.id,
        "recruiter_id": recruiter_id,
    }

    celery_task_id: str | None = None
    if should_use_celery_broker():
        try:
            async_res = celery_app.send_task(
                task_name,
                kwargs=payload_kwargs,
                queue=queue_name,
            )
            celery_task_id = str(async_res.id)
            updated = job_svc.attach_celery_task(job.id, recruiter_id, celery_task_id, queue_name=queue_name)
            if updated is not None:
                job = updated
        except Exception:
            logger.exception("Failed to send Celery task %s", task_name)
            if fallback_fn is not None and background_tasks is not None:
                background_tasks.add_task(fallback_fn, **payload_kwargs)
            else:
                raise
    elif fallback_fn is not None and background_tasks is not None:
        background_tasks.add_task(fallback_fn, **payload_kwargs)

    return JobAcceptedResponse(
        job_id=job.id,
        celery_task_id=celery_task_id,
        status=job.status,
        queue_name=job.queue_name,
        job=job,
    )
