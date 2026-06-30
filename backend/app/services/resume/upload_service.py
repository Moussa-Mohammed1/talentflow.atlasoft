from __future__ import annotations

from pathlib import Path

from fastapi import BackgroundTasks, UploadFile
from sqlalchemy.orm import Session

from app.schemas.resume import ResumeRead
from app.services.resume_service import create_resume

from .notification_helper import NotificationHelper


class ResumeUploadService:
    """Handles resume file upload and validation."""

    @staticmethod
    def upload(
        db: Session,
        recruiter_id: int,
        file: UploadFile,
        background_tasks: BackgroundTasks,
    ) -> ResumeRead:
        display_name = Path(file.filename or "resume").name
        resume = create_resume(file=file, recruiter_id=recruiter_id, db=db)
        NotificationHelper.notify_upload(
            background_tasks, db, recruiter_id=recruiter_id, filename=display_name,
        )
        return ResumeRead.model_validate(resume)
