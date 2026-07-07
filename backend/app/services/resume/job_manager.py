from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.job import JobType
from app.schemas.job import JobCreate
from app.services.job_service import JobService


class AnalysisJobs:
    skill_id: int
    experience_id: int
    language_id: int
    education_id: int
    certification_id: int

    def __init__(self, skill_id: int, experience_id: int, language_id: int, education_id: int, certification_id: int):
        self.skill_id = skill_id
        self.experience_id = experience_id
        self.language_id = language_id
        self.education_id = education_id
        self.certification_id = certification_id


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
            JobType.SKILL_EXTRACTION, filename, "Extraction des compétences du CV"
        )
        exp_id = self.create(
            JobType.EXPERIENCE_EXTRACTION, filename, "Extraction des expériences du CV"
        )
        lang_id = self.create(
            JobType.LANGUAGE_EXTRACTION, filename, "Extraction des langues du CV"
        )
        edu_id = self.create(
            JobType.EDUCATION_EXTRACTION, filename, "Extraction des formations du CV"
        )
        cert_id = self.create(
            JobType.CERTIFICATION_EXTRACTION, filename, "Extraction des certifications du CV"
        )
        return AnalysisJobs(skill_id, exp_id, lang_id, edu_id, cert_id)

    def start_analysis_jobs(self, jobs: AnalysisJobs) -> None:
        self.start(jobs.skill_id, "Extraction des compétences du CV")
        self.start(jobs.experience_id, "Extraction des expériences du CV")
        self.start(jobs.language_id, "Extraction des langues du CV")
        self.start(jobs.education_id, "Extraction des formations du CV")
        self.start(jobs.certification_id, "Extraction des certifications du CV")

    def complete_skills(self, job_id: int, count: int) -> None:
        self.complete(job_id, f"{count} compétence(s) trouvée(s)")

    def complete_experiences(self, job_id: int, count: int) -> None:
        self.complete(job_id, f"{count} expérience(s) trouvée(s)")

    def complete_languages(self, job_id: int, count: int) -> None:
        self.complete(job_id, f"{count} langue(s) trouvée(s)")

    def complete_educations(self, job_id: int, count: int) -> None:
        self.complete(job_id, f"{count} formation(s) trouvée(s)")

    def complete_certifications(self, job_id: int, count: int) -> None:
        self.complete(job_id, f"{count} certification(s) trouvée(s)")
