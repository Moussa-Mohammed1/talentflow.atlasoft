from __future__ import annotations

import logging
from typing import Any

from celery import Task
from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.exc import OperationalError, TimeoutError as SQLAlchemyTimeoutError

from app.core.database import SessionLocal
from app.services.job_service import JobService
from app.services.notification_manager import notification_manager
from app.services.notification_service import NotificationService
from app.workers.celery_app import celery_app

logger = logging.getLogger("talentflow.celery.tasks")

TRANSIENT_EXCEPTIONS = (
    OperationalError,
    SQLAlchemyTimeoutError,
    TimeoutError,
    ConnectionError,
    OSError,
)


class TrackedCeleryTask(Task):
    """Celery task base with bounded exponential backoff retries and PostgreSQL status sync."""

    autoretry_for = TRANSIENT_EXCEPTIONS
    dont_autoretry_for = (HTTPException, ValueError, FileNotFoundError)
    max_retries = 3
    retry_backoff = True
    retry_backoff_max = 60
    retry_jitter = True

    def on_retry(self, exc, task_id, args, kwargs, einfo) -> None:
        job_id = kwargs.get("job_id")
        recruiter_id = kwargs.get("recruiter_id")
        if job_id is not None and recruiter_id is not None:
            db = SessionLocal()
            try:
                JobService(db).record_retry(
                    int(job_id),
                    int(recruiter_id),
                    retries=int(self.request.retries) + 1,
                    error_details=str(exc),
                )
            finally:
                db.close()

    def on_failure(self, exc, task_id, args, kwargs, einfo) -> None:
        job_id = kwargs.get("job_id")
        recruiter_id = kwargs.get("recruiter_id")
        if job_id is not None and recruiter_id is not None:
            db = SessionLocal()
            try:
                job_svc = JobService(db)
                existing = job_svc.get_job(int(job_id), int(recruiter_id))
                if existing is not None and existing.status != "failed":
                    job_svc.fail_job(
                        int(job_id),
                        int(recruiter_id),
                        message=str(exc) or "Background task failed",
                        error_details=str(exc),
                        retries=int(self.request.retries),
                    )
            finally:
                db.close()


@celery_app.task(name="talentflow.system.ping", bind=True, base=TrackedCeleryTask)
def ping_worker_task(self) -> dict[str, str]:
    return {"status": "ok", "task_id": str(self.request.id or "eager")}


def execute_resume_analysis_job(
    *,
    job_id: int,
    recruiter_id: int,
    resume_id: int | None = None,
    resume_path: str | None = None,
    require_candidat: bool = False,
) -> dict[str, Any]:
    """Run full resume analysis and update durable job progress across each stage."""
    from app.schemas.experience_extraction import ResumeExperienceAnalysisRead
    from app.schemas.language_extraction import ResumeLanguageAnalysisRead
    from app.schemas.skill_extraction import ResumeSkillAnalysisRead
    from app.schemas.education_extraction import ResumeEducationAnalysisRead
    from app.schemas.certification_extraction import ResumeCertificationAnalysisRead
    from app.services.certification_extraction.pipeline import PretrainedBilingualCertificationExtractor
    from app.services.education_extraction.pipeline import PretrainedBilingualEducationExtractor
    from app.services.experience_extraction.pipeline import PretrainedBilingualExperienceExtractor
    from app.services.language_extraction.pipeline import ResumeLanguageExtractionPipeline
    from app.services.resume.persistence_service import PersistenceService
    from app.services.resume.resume_loader import ResumeLoader
    from app.services.resume.skill_mapper import SkillMapper
    from app.services.resume_extraction.extractor import TextExtractionService
    from app.services.skill_extraction.pipeline import PretrainedBilingualExtractor

    db = SessionLocal()
    job_svc = JobService(db)
    filename = resume_path or f"resume-{resume_id}"
    try:
        resume = (
            ResumeLoader.by_id(db, int(resume_id), recruiter_id)
            if resume_id is not None
            else ResumeLoader.by_path(db, str(resume_path), recruiter_id)
        )
        filename = resume.path.split("/")[-1]
        job_svc.start_job(
            job_id,
            recruiter_id,
            f"Extracting text from {filename}",
            current_step="extracting_text",
            progress=10,
        )

        with ResumeLoader.open_file(resume.path) as local_path:
            local_str = str(local_path)
            raw_text = TextExtractionService().extract(local_str)

            job_svc.set_progress(
                job_id, recruiter_id, progress=30, current_step="extracting_skills", message="Extracting skills"
            )
            skills_raw = PretrainedBilingualExtractor(db=db, recruiter_id=recruiter_id).extract_skills(raw_text)
            converted_skills = SkillMapper.convert_skills(skills_raw)
            skill_analysis = ResumeSkillAnalysisRead.model_validate(converted_skills)

            job_svc.set_progress(
                job_id, recruiter_id, progress=50, current_step="extracting_experiences", message="Extracting experiences"
            )
            exp_raw = PretrainedBilingualExperienceExtractor(db=db, recruiter_id=recruiter_id).extract_experiences(raw_text)
            exp_analysis = ResumeExperienceAnalysisRead.model_validate({
                "sections": exp_raw.get("sections", []),
                "experiences": exp_raw.get("experiences", []),
                "stats": exp_raw.get("stats", {}),
            })

            job_svc.set_progress(
                job_id, recruiter_id, progress=65, current_step="extracting_educations", message="Extracting education"
            )
            edu_raw = PretrainedBilingualEducationExtractor(db=db, recruiter_id=recruiter_id).extract_education(local_str, raw_text)
            edu_analysis = ResumeEducationAnalysisRead.model_validate({
                "sections": edu_raw.get("sections", []),
                "educations": edu_raw.get("educations", []),
                "stats": edu_raw.get("stats", {}),
            })

            job_svc.set_progress(
                job_id, recruiter_id, progress=80, current_step="extracting_certifications", message="Extracting certifications"
            )
            cert_raw = PretrainedBilingualCertificationExtractor(db=db, recruiter_id=recruiter_id).extract_certifications(raw_text)
            cert_analysis = ResumeCertificationAnalysisRead.model_validate({
                "sections": cert_raw.get("sections", []),
                "certifications": cert_raw.get("certifications", []),
                "stats": cert_raw.get("stats", {}),
            })

            job_svc.set_progress(
                job_id, recruiter_id, progress=90, current_step="extracting_languages", message="Extracting languages"
            )
            lang_raw = ResumeLanguageExtractionPipeline(db=db, recruiter_id=recruiter_id).extract_languages(raw_text)
            lang_analysis = ResumeLanguageAnalysisRead.model_validate({
                "sections": lang_raw.get("sections", []),
                "languages": lang_raw.get("languages", []),
                "stats": lang_raw.get("stats", {}),
            })

        job_svc.set_progress(
            job_id, recruiter_id, progress=95, current_step="persisting_results", message="Saving extracted data"
        )
        candidat = PersistenceService.get_candidat_or_none(db, resume.id)
        if candidat is None and require_candidat:
            raise HTTPException(status_code=404, detail="Aucun candidat associé à ce CV.")
        if candidat is not None:
            stats = PersistenceService.persist_all(
                db,
                candidat.id,
                skill_analysis,
                exp_analysis,
                lang_analysis,
                educations=edu_analysis,
                certifications=cert_analysis,
                raw_text=raw_text,
            )
        else:
            stats = {"persistence_reason": "candidate_identity_not_extracted"}

        payload = {
            "resume_id": resume.id,
            "skills_count": len(skills_raw.get("technologies", [])) + len(skills_raw.get("competencies", [])),
            "experiences_count": len(exp_raw.get("experiences", [])),
            "educations_count": len(edu_raw.get("educations", [])),
            "certifications_count": len(cert_raw.get("certifications", [])),
            "languages_count": len(lang_raw.get("languages", [])),
            "persistence": stats,
            "analysis": skill_analysis.model_dump(mode="json"),
        }
        job_svc.complete_job(
            job_id,
            recruiter_id,
            f"Resume analysis completed for {filename}",
            result_payload=payload,
        )
        notification = NotificationService.resume_analysis_completed(
            db, recruiter_id=recruiter_id, filename=filename
        )
        notification_manager.publish_sync(
            recruiter_id,
            {"event": "notification.created", "data": {"id": notification.id, "recruiter_id": notification.recruiter_id, "title": notification.title, "message": notification.message, "type": notification.type.value, "is_read": notification.is_read, "created_at": notification.created_at.isoformat()}},
        )
        return payload
    except Exception as exc:
        logger.exception("Resume analysis task failed for job_id=%s", job_id)
        if not isinstance(exc, TRANSIENT_EXCEPTIONS):
            job_svc.fail_job(
                job_id,
                recruiter_id,
                message=f"Analysis failed for {filename}",
                error_details=str(exc),
            )
            notification = NotificationService.resume_analysis_failed(
                db, recruiter_id=recruiter_id, filename=filename, reason=str(exc)
            )
            notification_manager.publish_sync(
                recruiter_id,
                {"event": "notification.created", "data": {"id": notification.id, "recruiter_id": notification.recruiter_id, "title": notification.title, "message": notification.message, "type": notification.type.value, "is_read": notification.is_read, "created_at": notification.created_at.isoformat()}},
            )
        raise
    finally:
        db.close()


@celery_app.task(name="talentflow.cv.analyze_resume", bind=True, base=TrackedCeleryTask)
def analyze_resume_celery_task(
    self,
    *,
    job_id: int,
    recruiter_id: int,
    resume_id: int | None = None,
    resume_path: str | None = None,
    require_candidat: bool = False,
) -> dict[str, Any]:
    return execute_resume_analysis_job(
        job_id=job_id,
        recruiter_id=recruiter_id,
        resume_id=resume_id,
        resume_path=resume_path,
        require_candidat=require_candidat,
    )


def execute_evaluate_candidate_job(
    *,
    job_id: int,
    recruiter_id: int,
    candidate_id: int,
) -> dict[str, Any]:
    from app.services.evaluation_service import EvaluationService

    db = SessionLocal()
    job_svc = JobService(db)
    try:
        job_svc.start_job(
            job_id,
            recruiter_id,
            f"Evaluating candidate #{candidate_id}",
            current_step="evaluating_candidate",
            progress=25,
        )
        result = EvaluationService(db).evaluate(candidate_id)
        payload = {
            "candidate_id": candidate_id,
            "departments_evaluated": len(result.evaluations),
        }
        job_svc.complete_job(
            job_id,
            recruiter_id,
            f"Candidate #{candidate_id} evaluation complete",
            result_payload=payload,
        )
        return payload
    except Exception as exc:
        if not isinstance(exc, TRANSIENT_EXCEPTIONS):
            job_svc.fail_job(
                job_id,
                recruiter_id,
                message=f"Evaluation failed for candidate #{candidate_id}",
                error_details=str(exc),
            )
        raise
    finally:
        db.close()


@celery_app.task(name="talentflow.ai.evaluate_candidate", bind=True, base=TrackedCeleryTask)
def evaluate_candidate_celery_task(
    self,
    *,
    job_id: int,
    recruiter_id: int,
    candidate_id: int,
) -> dict[str, Any]:
    return execute_evaluate_candidate_job(
        job_id=job_id,
        recruiter_id=recruiter_id,
        candidate_id=candidate_id,
    )


def execute_generate_job_offer_job(
    *,
    job_id: int,
    recruiter_id: int,
    description: str,
) -> dict[str, Any]:
    from app.services.job_offers_generation_service import JobOffersGenerationService

    db = SessionLocal()
    job_svc = JobService(db)
    try:
        job_svc.start_job(
            job_id,
            recruiter_id,
            "Generating AI job offer",
            current_step="generating_job_offer",
            progress=30,
        )
        offer = JobOffersGenerationService(db, recruiter_id=recruiter_id).generate_from_description(description)
        payload = {
            "job_offer_id": str(offer.id),
            "title": offer.title,
        }
        job_svc.complete_job(
            job_id,
            recruiter_id,
            f"Generated job offer: {offer.title}",
            result_payload=payload,
        )
        return payload
    except Exception as exc:
        if not isinstance(exc, TRANSIENT_EXCEPTIONS):
            job_svc.fail_job(
                job_id,
                recruiter_id,
                message="AI job offer generation failed",
                error_details=str(exc),
            )
        raise
    finally:
        db.close()


@celery_app.task(name="talentflow.ai.generate_job_offer", bind=True, base=TrackedCeleryTask)
def generate_job_offer_celery_task(
    self,
    *,
    job_id: int,
    recruiter_id: int,
    description: str,
) -> dict[str, Any]:
    return execute_generate_job_offer_job(
        job_id=job_id,
        recruiter_id=recruiter_id,
        description=description,
    )


def run_local_task_fallback(
    background_tasks: BackgroundTasks,
    *,
    fn,
    kwargs: dict[str, Any],
) -> None:
    """Fallback executor for local bare-metal dev when Redis/Celery broker is unconfigured."""
    background_tasks.add_task(fn, **kwargs)


def execute_recruitment_workflow_job(
    *,
    job_id: int,
    recruiter_id: int,
    request_payload: dict[str, Any],
) -> dict[str, Any]:
    from app.schemas.workflows import CandidateRecruitmentWorkflowRequest
    from app.services.workflows.recruitment_graph import RecruitmentWorkflowRunner

    db = SessionLocal()
    job_svc = JobService(db)
    try:
        req = CandidateRecruitmentWorkflowRequest.model_validate(request_payload)
        job_svc.start_job(
            job_id,
            recruiter_id,
            f"Running LangGraph workflow for candidate #{req.candidate_id}",
            current_step="running_langgraph_workflow",
            progress=20,
        )
        result = RecruitmentWorkflowRunner(db, recruiter_id=recruiter_id).run(req)
        payload = result.model_dump(mode="json")
        if result.status == "failed":
            job_svc.fail_job(
                job_id,
                recruiter_id,
                message=result.error_message or "LangGraph workflow failed",
                error_details=result.error_message or "Workflow failed",
            )
            return payload

        job_svc.complete_job(
            job_id,
            recruiter_id,
            f"LangGraph workflow finished ({result.status}) for candidate #{req.candidate_id}",
            result_payload=payload,
        )
        return payload
    except Exception as exc:
        if not isinstance(exc, TRANSIENT_EXCEPTIONS):
            job_svc.fail_job(
                job_id,
                recruiter_id,
                message="LangGraph workflow execution failed",
                error_details=str(exc),
            )
        raise
    finally:
        db.close()


@celery_app.task(name="talentflow.ai.run_recruitment_workflow", bind=True, base=TrackedCeleryTask)
def recruitment_workflow_celery_task(
    self,
    *,
    job_id: int,
    recruiter_id: int,
    request_payload: dict[str, Any],
) -> dict[str, Any]:
    return execute_recruitment_workflow_job(
        job_id=job_id,
        recruiter_id=recruiter_id,
        request_payload=request_payload,
    )
