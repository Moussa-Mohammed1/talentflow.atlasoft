from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.job import JobType
from app.schemas.job import JobCreate
from app.services.job_service import JobService


class AnalysisJobs:
    skill_id: int
    experience_id: int
    language_id: int

    def __init__(self, skill_id: int, experience_id: int, language_id: int):
        self.skill_id = skill_id
        self.experience_id = experience_id
        self.language_id = language_id


class JobManager:
    """Manages the lifecycle of background extraction jobs."""

    def __init__(self, db: Session, recruiter_id: int):
        self._service = JobService(db)
        self._recruiter_id = recruiter_id

    def create(self, job_type: JobType, target: str, message: str) -> int:
        job = self._service.create_job(
            JobCreate(
                recruiter_id=self._recruiter_id,
                type=job_type,
                target=target,
                message=message,
            )
        )
        return job.id

    def start(self, job_id: int, message: str) -> None:
        self._service.start_job(job_id, self._recruiter_id, message)

    def complete(self, job_id: int, message: str) -> None:
        self._service.complete_job(job_id, self._recruiter_id, message)

    def fail(self, job_id: int, message: str) -> None:
        self._service.fail_job(job_id, self._recruiter_id, message)

    def create_analysis_jobs(self, filename: str) -> AnalysisJobs:
        skill_id = self.create(
            JobType.SKILL_EXTRACTION, filename, "Extracting skills from resume"
        )
        exp_id = self.create(
            JobType.EXPERIENCE_EXTRACTION, filename, "Extracting experience from resume"
        )
        lang_id = self.create(
            JobType.LANGUAGE_EXTRACTION, filename, "Extracting languages from resume"
        )
        return AnalysisJobs(skill_id, exp_id, lang_id)

    def start_analysis_jobs(self, jobs: AnalysisJobs) -> None:
        self.start(jobs.skill_id, "Extracting skills from resume")
        self.start(jobs.experience_id, "Extracting experience from resume")
        self.start(jobs.language_id, "Extracting languages from resume")

    def complete_skills(self, job_id: int, count: int) -> None:
        self.complete(job_id, f"Found {count} skills")

    def complete_experiences(self, job_id: int, count: int) -> None:
        self.complete(job_id, f"Found {count} experiences")

    def complete_languages(self, job_id: int, count: int) -> None:
        self.complete(job_id, f"Found {count} language(s)")
