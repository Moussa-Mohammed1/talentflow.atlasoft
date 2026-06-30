from __future__ import annotations

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.schemas.skill_extraction import ResumeAnalysisRead

from .analysis_workflow import ResumeAnalysisWorkflow, ResumeLookup


class ResumeAnalysisService:
    """Entry point for analysis operations (analyze / re-analyze)."""

    @staticmethod
    def analyze(
        db: Session,
        recruiter_id: int,
        background_tasks: BackgroundTasks,
        path: str,
    ) -> ResumeAnalysisRead:
        return ResumeAnalysisWorkflow(
            db=db,
            recruiter_id=recruiter_id,
            background_tasks=background_tasks,
            lookup_type=ResumeLookup.PATH,
            lookup_value=path,
            require_candidat=False,
        ).execute()

    @staticmethod
    def reanalyze(
        db: Session,
        recruiter_id: int,
        background_tasks: BackgroundTasks,
        resume_id: int,
    ) -> ResumeAnalysisRead:
        return ResumeAnalysisWorkflow(
            db=db,
            recruiter_id=recruiter_id,
            background_tasks=background_tasks,
            lookup_type=ResumeLookup.ID,
            lookup_value=resume_id,
            require_candidat=True,
        ).execute()
