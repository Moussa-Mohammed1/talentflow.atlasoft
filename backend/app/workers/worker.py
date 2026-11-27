from __future__ import annotations

import logging
from typing import Any

from fastapi import BackgroundTasks

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import configure_logging
from app.workers.queue import parse_redis_settings

configure_logging(settings.log_level)
logger = logging.getLogger("talentflow.worker")


async def ping_worker(_ctx: dict[str, Any]) -> dict[str, str]:
    """Lightweight readiness task for verifying worker-Redis connectivity."""
    return {"status": "ok"}


async def analyze_resume_task(
    _ctx: dict[str, Any],
    resume_id: int,
    recruiter_id: int,
    require_candidat: bool = False,
) -> dict[str, Any]:
    """Execute full resume analysis inside the dedicated worker container."""
    from app.services.resume.analysis_workflow import ResumeAnalysisWorkflow, ResumeLookup

    logger.info("Worker starting analysis for resume_id=%s recruiter_id=%s", resume_id, recruiter_id)
    bg_tasks = BackgroundTasks()
    db = SessionLocal()
    try:
        workflow = ResumeAnalysisWorkflow(
            db=db,
            recruiter_id=recruiter_id,
            background_tasks=bg_tasks,
            lookup_type=ResumeLookup.ID,
            lookup_value=resume_id,
            require_candidat=require_candidat,
        )
        result = workflow.execute()
        await bg_tasks()
        return {"status": "completed", "resume_id": resume_id, "text_len": len(result.raw_text or "")}
    finally:
        db.close()


class WorkerSettings:
    functions = [ping_worker, analyze_resume_task]
    redis_settings = parse_redis_settings()
    max_jobs = 4
    job_timeout = 600
