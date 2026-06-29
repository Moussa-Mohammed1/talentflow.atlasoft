import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pathlib import Path
from typing import List

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.candidat import Candidat
from app.repositories.candidat_repository import CandidatRepository
from app.repositories.experience_repository import ExperienceRepository
from app.repositories.skill_repository import SkillRepository
from app.schemas.experience_extraction import ResumeExperienceAnalysisRead, ResumeExperienceRead
from app.schemas.identity_extraction import ResumeIdentityRead
from app.schemas.resume import ResumePathRequest, ResumeIdRequest, ResumeRead, ResumeTextRead, DocumentListSchema, ResumeDetailSchema, ResumeFullDetailSchema, CandidatUpdateSchema, ExperienceUpdateSchema, EducationUpdateSchema, CertificationUpdateSchema
from app.schemas.skill_extraction import ResumeAnalysisRead, ResumeSkillAnalysisRead
from app.services.resume_service import create_resume, get_resume_by_path, get_resume_by_id, resolve_stored_resume_path, get_resumes_list, get_resume_detail, get_full_resume_detail, delete_resume_and_file
from app.repositories.resumer_repository import ResumeRepository
from app.services.candidat_service import update_candidat_from_identity
from app.services.resume_extraction.extractor import TextExtractionService
from app.services.resume_extraction.extractor import UnsupportedFileTypeError
from app.services.identity_extraction.pipeline import ResumeIdentityPipeline
from app.services.experience_extraction.pipeline import PretrainedBilingualExperienceExtractor
from app.services.language_extraction.pipeline import ResumeLanguageExtractionPipeline
from app.services.skill_extraction.pipeline import PretrainedBilingualExtractor
from app.services.notification_manager import notification_manager
from app.services.notification_service import NotificationService
from app.models.job import JobType
from app.repositories.language_repository import LanguageRepository
from app.schemas.language_extraction import ResumeLanguageRead, ResumeLanguageAnalysisRead
from app.schemas.job import JobCreate, JobStatusUpdate
from app.services.job_service import JobService
router = APIRouter(prefix="/resumes", tags=["resumes"])
logger = logging.getLogger(__name__)


def _queue_notification(background_tasks: BackgroundTasks, notification) -> None:
	"""Push a committed notification after the HTTP response is sent."""
	background_tasks.add_task(notification_manager.broadcast, notification)


def _create_notification(background_tasks: BackgroundTasks, factory, *args, **kwargs) -> None:
	"""Keep notification infrastructure failures from breaking resume workflows."""
	try:
		notification = factory(*args, **kwargs)
	except Exception:
		logger.exception("Could not create resume workflow notification")
		return
	_queue_notification(background_tasks, notification)


def _create_job(db: Session, recruiter_id: int, job_type: JobType, target: str, message: str | None = None) -> int:
	"""Create a background job and return its ID."""
	job_service = JobService(db)
	job_in = JobCreate(recruiter_id=recruiter_id, type=job_type, target=target, message=message)
	job = job_service.create_job(job_in)
	return job.id


def _update_job_status(db: Session, job_id: int, recruiter_id: int, status: str, message: str | None = None) -> None:
	"""Update job status."""
	job_service = JobService(db)
	job_service.update_job_status(job_id, recruiter_id, JobStatusUpdate(status=status, message=message))


@router.post("/upload", response_model=ResumeRead, status_code=status.HTTP_201_CREATED)
def upload_resume(
	background_tasks: BackgroundTasks,
	file: UploadFile = File(...),
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	print("=== REQUEST RECEIVED === /upload", flush=True)
	display_name = Path(file.filename or "resume").name
	resume = create_resume(file=file, recruiter_id=current_user.id, db=db)
	_create_notification(
		background_tasks,
		NotificationService.resume_uploaded,
		db,
		recruiter_id=current_user.id,
		filename=display_name,
	)
	return resume


@router.post("/analyze", response_model=ResumeAnalysisRead, status_code=status.HTTP_200_OK)
def analyze_resume(
	payload: ResumePathRequest,
	background_tasks: BackgroundTasks,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	print("=== REQUEST RECEIVED === /analyze", flush=True)
	text_extractor = TextExtractionService()
	skill_extractor = PretrainedBilingualExtractor()
	experience_extractor = PretrainedBilingualExperienceExtractor()
	language_extractor = ResumeLanguageExtractionPipeline()
	resume = get_resume_by_path(path=payload.path, recruiter_id=current_user.id, db=db)
	if resume is None:
		raise HTTPException(status_code=404, detail="Resume was not found for this recruiter")

	# Create jobs for skill extraction, experience extraction and language extraction
	skill_job_id = _create_job(db, current_user.id, JobType.SKILL_EXTRACTION, Path(resume.path).name, "Extracting skills from resume")
	experience_job_id = _create_job(db, current_user.id, JobType.EXPERIENCE_EXTRACTION, Path(resume.path).name, "Extracting experience from resume")
	language_job_id = _create_job(db, current_user.id, JobType.LANGUAGE_EXTRACTION, Path(resume.path).name, "Extracting languages from resume")

	try:
		_update_job_status(db, skill_job_id, current_user.id, "running", "Extracting skills from resume")
		_update_job_status(db, experience_job_id, current_user.id, "running", "Extracting experience from resume")
		_update_job_status(db, language_job_id, current_user.id, "running", "Extracting languages from resume")
		
		raw_text = text_extractor.extract(str(resolve_stored_resume_path(resume.path)))

		skill_result = skill_extractor.extract_skills(raw_text)
		_update_job_status(db, skill_job_id, current_user.id, "completed", f"Found {len(skill_result.get('technologies', [])) + len(skill_result.get('competencies', []))} skills")
		
		experience_result = experience_extractor.extract_experiences(raw_text)
		_update_job_status(db, experience_job_id, current_user.id, "completed", f"Found {len(experience_result.get('experiences', []))} experiences")

		language_result = language_extractor.extract_languages(raw_text)
		lang_count = len(language_result.get("languages", []))
		_update_job_status(db, language_job_id, current_user.id, "completed", f"Found {lang_count} language(s)")

		language_analysis = ResumeLanguageAnalysisRead.model_validate(
			{
				"sections": language_result.get("sections", []),
				"languages": language_result.get("languages", []),
				"stats": language_result.get("stats", {}),
			}
		)

		def _convert_mention(m: dict) -> dict:
			signals = m.get("scores", {})
			return {
				"original": m.get("original", ""),
				"normalized": m.get("normalized", ""),
				"name": m.get("canonical") or m.get("normalized") or m.get("original"),
				"category": m.get("category", ""),
				"confidence": float(m.get("confidence", 0.0) or 0.0),
				"section": m.get("section", ""),
				"source": ",".join(m.get("sources", [])) if m.get("sources") else "",
				"signals": {
					"ner_score": float(signals.get("validation", 0.0)),
					"semantic_score": float(signals.get("semantic", 0.0)),
					"section_score": float(signals.get("section", 0.0)),
					"frequency_score": float(signals.get("frequency", 0.0)),
					"context_score": float(signals.get("context", 0.0)),
				},
			}

		converted_skills = {
			"sections": skill_result.get("sections", []),
			"technologies": [_convert_mention(m) for m in skill_result.get("technologies", [])],
			"competencies": [_convert_mention(m) for m in skill_result.get("competencies", [])],
			"skills_by_category": {
				cat: [_convert_mention(m) for m in items]
				for cat, items in (skill_result.get("skills_by_category") or {}).items()
			},
			"flattened_skills": [s.get("normalized") or s.get("original") for s in skill_result.get("skills", [])],
		}

		experience_analysis = ResumeExperienceAnalysisRead.model_validate(
			{
				"sections": experience_result.get("sections", []),
				"experiences": experience_result.get("experiences", []),
				"stats": experience_result.get("stats", {}),
			}
		)

		candidat = CandidatRepository.get_by_resume_id(db, resume.id)
		if candidat is not None:
			skills_analysis = ResumeSkillAnalysisRead.model_validate(converted_skills)
			stored_skills = SkillRepository.replace_for_candidate(
				db, candidat_id=candidat.id, skills=skills_analysis.technologies + skills_analysis.competencies,
			)
			stored_experiences = ExperienceRepository.replace_for_candidate(
				db, candidat_id=candidat.id, experiences=experience_analysis.experiences,
			)
			stored_languages = LanguageRepository.replace_for_candidate(
				db, candidat_id=candidat.id, languages=language_analysis.languages,
			)
			experience_analysis.stats["skills_persisted_count"] = len(stored_skills)
			experience_analysis.stats["persisted_count"] = len(stored_experiences)
			experience_analysis.stats["languages_persisted_count"] = len(stored_languages)
		else:
			experience_analysis.stats["skills_persisted_count"] = 0
			experience_analysis.stats["persisted_count"] = 0
			experience_analysis.stats["languages_persisted_count"] = 0
			experience_analysis.stats["persistence_reason"] = "candidate_identity_not_extracted"

	except UnsupportedFileTypeError as e:
		_create_notification(
			background_tasks,
			NotificationService.resume_analysis_failed,
			db,
			recruiter_id=current_user.id,
			filename=Path(resume.path).name,
			reason=str(e),
		)
		raise HTTPException(
			status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
			 detail=str(e) + ", allowed: pdf, docx",
		)
	except HTTPException as e:
		_create_notification(
			background_tasks,
			NotificationService.resume_analysis_failed,
			db,
			recruiter_id=current_user.id,
			filename=Path(resume.path).name,
			reason=str(e.detail),
		)
		raise
	except Exception:
		logger.exception("Resume analysis failed for resume %s", resume.id)
		_create_notification(
			background_tasks,
			NotificationService.resume_analysis_failed,
			db,
			recruiter_id=current_user.id,
			filename=Path(resume.path).name,
			reason="An unexpected processing error occurred.",
		)
		raise HTTPException(status_code=500, detail="Resume analysis failed")

	response = ResumeAnalysisRead(
		raw_text=raw_text,
		analysis=ResumeSkillAnalysisRead.model_validate(converted_skills),
		experience=experience_analysis.model_dump(),
		languages=language_analysis.model_dump(),
	)
	_create_notification(
		background_tasks,
		NotificationService.resume_analysis_completed,
		db,
		recruiter_id=current_user.id,
		filename=Path(resume.path).name,
	)
	return response


@router.post("/re-analyze", response_model=ResumeAnalysisRead, status_code=status.HTTP_200_OK)
def re_analyze_resume(
    payload: ResumeIdRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print("=== REQUEST RECEIVED === /re-analyze", flush=True)
    text_extractor = TextExtractionService()
    skill_extractor = PretrainedBilingualExtractor()
    experience_extractor = PretrainedBilingualExperienceExtractor()
    language_extractor = ResumeLanguageExtractionPipeline()
    resume = get_resume_by_id(resume_id=payload.resume_id, recruiter_id=current_user.id, db=db)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume was not found for this recruiter")

    # Create jobs for skill extraction, experience extraction and language extraction
    skill_job_id = _create_job(db, current_user.id, JobType.SKILL_EXTRACTION, Path(resume.path).name, "Re-extracting skills from resume")
    experience_job_id = _create_job(db, current_user.id, JobType.EXPERIENCE_EXTRACTION, Path(resume.path).name, "Re-extracting experience from resume")
    language_job_id = _create_job(db, current_user.id, JobType.LANGUAGE_EXTRACTION, Path(resume.path).name, "Re-extracting languages from resume")

    try:
        _update_job_status(db, skill_job_id, current_user.id, "running", "Re-extracting skills from resume")
        _update_job_status(db, experience_job_id, current_user.id, "running", "Re-extracting experience from resume")
        _update_job_status(db, language_job_id, current_user.id, "running", "Re-extracting languages from resume")
        
        raw_text = text_extractor.extract(str(resolve_stored_resume_path(resume.path)))

        skill_result = skill_extractor.extract_skills(raw_text)
        _update_job_status(db, skill_job_id, current_user.id, "completed", f"Found {len(skill_result.get('technologies', [])) + len(skill_result.get('competencies', []))} skills")
        
        experience_result = experience_extractor.extract_experiences(raw_text)
        _update_job_status(db, experience_job_id, current_user.id, "completed", f"Found {len(experience_result.get('experiences', []))} experiences")

        language_result = language_extractor.extract_languages(raw_text)
        lang_count = len(language_result.get("languages", []))
        _update_job_status(db, language_job_id, current_user.id, "completed", f"Found {lang_count} language(s)")

        language_analysis = ResumeLanguageAnalysisRead.model_validate(
            {
                "sections": language_result.get("sections", []),
                "languages": language_result.get("languages", []),
                "stats": language_result.get("stats", {}),
            }
        )

        def _convert_mention(m: dict) -> dict:
            signals = m.get("scores", {})
            return {
                "original": m.get("original", ""),
                "normalized": m.get("normalized", ""),
                "name": m.get("canonical") or m.get("normalized") or m.get("original"),
                "category": m.get("category", ""),
                "confidence": float(m.get("confidence", 0.0) or 0.0),
                "section": m.get("section", ""),
                "source": ",".join(m.get("sources", [])) if m.get("sources") else "",
                "signals": {
                    "ner_score": float(signals.get("validation", 0.0)),
                    "semantic_score": float(signals.get("semantic", 0.0)),
                    "section_score": float(signals.get("section", 0.0)),
                    "frequency_score": float(signals.get("frequency", 0.0)),
                    "context_score": float(signals.get("context", 0.0)),
                },
            }

        converted_skills = {
            "sections": skill_result.get("sections", []),
            "technologies": [_convert_mention(m) for m in skill_result.get("technologies", [])],
            "competencies": [_convert_mention(m) for m in skill_result.get("competencies", [])],
            "skills_by_category": {
                cat: [_convert_mention(m) for m in items]
                for cat, items in (skill_result.get("skills_by_category") or {}).items()
            },
            "flattened_skills": [s.get("normalized") or s.get("original") for s in skill_result.get("skills", [])],
        }

        experience_analysis = ResumeExperienceAnalysisRead.model_validate(
            {
                "sections": experience_result.get("sections", []),
                "experiences": experience_result.get("experiences", []),
                "stats": experience_result.get("stats", {}),
            }
        )

        candidat = CandidatRepository.get_by_resume_id(db, resume.id)
        if candidat is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No candidate associated with this resume. Please extract identity first.",
            )

        skills_analysis = ResumeSkillAnalysisRead.model_validate(converted_skills)
        stored_skills = SkillRepository.replace_for_candidate(
            db, candidat_id=candidat.id, skills=skills_analysis.technologies + skills_analysis.competencies,
        )
        stored_experiences = ExperienceRepository.replace_for_candidate(
            db, candidat_id=candidat.id, experiences=experience_analysis.experiences,
        )
        stored_languages = LanguageRepository.replace_for_candidate(
            db, candidat_id=candidat.id, languages=language_analysis.languages,
        )
        experience_analysis.stats["skills_persisted_count"] = len(stored_skills)
        experience_analysis.stats["persisted_count"] = len(stored_experiences)
        experience_analysis.stats["languages_persisted_count"] = len(stored_languages)

    except UnsupportedFileTypeError as e:
        _create_notification(
            background_tasks,
            NotificationService.resume_analysis_failed,
            db,
            recruiter_id=current_user.id,
            filename=Path(resume.path).name,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
             detail=str(e) + ", allowed: pdf, docx",
        )
    except HTTPException as e:
        _create_notification(
            background_tasks,
            NotificationService.resume_analysis_failed,
            db,
            recruiter_id=current_user.id,
            filename=Path(resume.path).name,
            reason=str(e.detail),
        )
        raise
    except Exception:
        logger.exception("Resume re-analysis failed for resume %s", resume.id)
        _create_notification(
            background_tasks,
            NotificationService.resume_analysis_failed,
            db,
            recruiter_id=current_user.id,
            filename=Path(resume.path).name,
            reason="An unexpected processing error occurred.",
        )
        raise HTTPException(status_code=500, detail="Resume re-analysis failed")

    response = ResumeAnalysisRead(
        raw_text=raw_text,
        analysis=ResumeSkillAnalysisRead.model_validate(converted_skills),
        experience=experience_analysis.model_dump(),
        languages=language_analysis.model_dump(),
    )
    _create_notification(
        background_tasks,
        NotificationService.resume_analysis_completed,
        db,
        recruiter_id=current_user.id,
        filename=Path(resume.path).name,
    )
    return response


@router.post("/identity", response_model=ResumeIdentityRead, status_code=status.HTTP_200_OK)
def extract_identity(
	payload: ResumePathRequest,
	background_tasks: BackgroundTasks,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	print("=== REQUEST RECEIVED === /identity", flush=True)
	text_extractor = TextExtractionService()
	identity_extractor = ResumeIdentityPipeline()
	resume = get_resume_by_path(path=payload.path, recruiter_id=current_user.id, db=db)
	if resume is None:
		raise HTTPException(status_code=404, detail="Resume was not found for this recruiter")

	# Create job for identity extraction
	identity_job_id = _create_job(db, current_user.id, JobType.IDENTITY_EXTRACTION, Path(resume.path).name, "Extracting candidate identity")

	try:
		_update_job_status(db, identity_job_id, current_user.id, "running", "Extracting candidate identity")
		raw_text = text_extractor.extract(str(resolve_stored_resume_path(resume.path)))
		identity = identity_extractor.analyze(raw_text)
		_update_job_status(db, identity_job_id, current_user.id, "completed", "Identity extraction completed")
	except UnsupportedFileTypeError as e:
		_update_job_status(db, identity_job_id, current_user.id, "failed", f"Failed to extract identity: {str(e)}")
		raise HTTPException(
			status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
			detail=str(e) + ", allowed: pdf, docx",
		)
	validated_identity = ResumeIdentityRead.model_validate(identity)
	email = (validated_identity.email.value or "").strip()
	phone = (validated_identity.phone.value or "").strip()
	duplicate = CandidatRepository.check_duplicate(db, email, phone, resume.id)
	if duplicate is not None:
		if duplicate is False:
			delete_resume_and_file(
				db,
				resume_id=resume.id,
				recruiter_id=current_user.id,
			)
			detail = (
				f"""
				Duplicate candidate: this identity already belongs to "{validated_identity.name.full_name}"
				resume; the new resume was deleted.
				"""
			)
		else:
			detail = f"Duplicate candidate: this identity is already saved for this resume {validated_identity.name.full_name}."
		_create_notification(
			background_tasks,
			NotificationService.duplicate_candidate_detected,
			db,
			recruiter_id=current_user.id,
			message=detail,
		)
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

	CandidatRepository.upsert_from_identity(db, resume_id=resume.id, identity=validated_identity)
	_create_notification(
		background_tasks,
		NotificationService.identity_extraction_completed,
		db,
		recruiter_id=current_user.id,
		candidate_name=validated_identity.name.full_name,
	)
	return validated_identity

@router.post("/{resume_id}/reanalyze-identity", response_model=ResumeIdentityRead, status_code=status.HTTP_200_OK)
def reanalyze_identity(
	resume_id: int,
	background_tasks: BackgroundTasks,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	resume = get_resume_detail(db, resume_id, recruiter_id=current_user.id)
	text_extractor = TextExtractionService()
	identity_extractor = ResumeIdentityPipeline()

	# Create job for identity extraction
	identity_job_id = _create_job(db, current_user.id, JobType.IDENTITY_EXTRACTION, Path(resume.path).name, "Re-extracting candidate identity")

	try:
		_update_job_status(db, identity_job_id, current_user.id, "running", "Re-extracting candidate identity")
		raw_text = text_extractor.extract(str(resolve_stored_resume_path(resume.path)))
		identity = identity_extractor.analyze(raw_text)
		_update_job_status(db, identity_job_id, current_user.id, "completed", "Identity re-extraction completed")
	except UnsupportedFileTypeError as e:
		_update_job_status(db, identity_job_id, current_user.id, "failed", f"Failed to re-extract identity: {str(e)}")
		raise HTTPException(
			status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
			detail=str(e) + ", allowed: pdf, docx",
		)

	validated_identity = ResumeIdentityRead.model_validate(identity)
	email = (validated_identity.email.value or "").strip()
	phone = (validated_identity.phone.value or "").strip()
	# if CandidatRepository.check_duplicate
	if CandidatRepository.check_duplicate(db, email, phone, resume.id):
		candidat = CandidatRepository.get_by_resume_id(db, resume.id)
		update_candidat_from_identity(db, candidat, validated_identity)
		notification = NotificationService.identity_extraction_updated
	else:
		candidat = Candidat(resume_id=resume.id, fullname="", email="", phone="")
		db.add(candidat)
		update_candidat_from_identity(db, candidat, validated_identity)
		notification = NotificationService.identity_extraction_completed

	_create_notification(
		background_tasks,
		notification,
		db,
		recruiter_id=current_user.id,
		candidate_name=validated_identity.name.full_name,
	)
	return validated_identity


@router.post("/experience", response_model=ResumeExperienceRead, status_code=status.HTTP_200_OK)
def extract_experience(
	payload: ResumePathRequest,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	text_extractor = TextExtractionService()
	experience_extractor = PretrainedBilingualExperienceExtractor()
	resume = get_resume_by_path(path=payload.path, recruiter_id=current_user.id, db=db)
	if resume is None:
		raise HTTPException(status_code=404, detail="Resume was not found for this recruiter")

	# Create job for experience extraction
	experience_job_id = _create_job(db, current_user.id, JobType.EXPERIENCE_EXTRACTION, Path(resume.path).name, "Extracting experience from resume")

	try:
		_update_job_status(db, experience_job_id, current_user.id, "running", "Extracting experience from resume")
		raw_text = text_extractor.extract(str(resolve_stored_resume_path(resume.path)))
		extracted = experience_extractor.extract_experiences(raw_text)
		_update_job_status(db, experience_job_id, current_user.id, "completed", f"Found {len(extracted.get('experiences', []))} experiences")
	except UnsupportedFileTypeError as e:
		_update_job_status(db, experience_job_id, current_user.id, "failed", f"Failed to extract experience: {str(e)}")
		raise HTTPException(
			status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
			detail=str(e) + ", allowed: pdf, docx",
		)

	analysis = ResumeExperienceAnalysisRead.model_validate(
		{
			"sections": extracted.get("sections", []),
			"experiences": extracted.get("experiences", []),
			"stats": extracted.get("stats", {}),
		}
	)
	candidat = CandidatRepository.get_by_resume_id(db, resume.id)
	if candidat is not None:
		stored = ExperienceRepository.replace_for_candidate(
			db,
			candidat_id=candidat.id,
			experiences=analysis.experiences,
		)
		analysis.stats["persisted_count"] = len(stored)
	else:
		analysis.stats["persisted_count"] = 0
		analysis.stats["persistence_reason"] = "candidate_identity_not_extracted"

	return ResumeExperienceRead(raw_text=raw_text, analysis=analysis)


@router.post("/language", response_model=ResumeLanguageRead, status_code=status.HTTP_200_OK)
def extract_language(
	payload: ResumePathRequest,
	background_tasks: BackgroundTasks,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	text_extractor = TextExtractionService()
	language_extractor = ResumeLanguageExtractionPipeline()
	resume = get_resume_by_path(path=payload.path, recruiter_id=current_user.id, db=db)
	if resume is None:
		raise HTTPException(status_code=404, detail="Resume was not found for this recruiter")

	language_job_id = _create_job(db, current_user.id, JobType.LANGUAGE_EXTRACTION, Path(resume.path).name, "Extracting languages from resume")

	try:
		_update_job_status(db, language_job_id, current_user.id, "running", "Extracting languages from resume")
		raw_text = text_extractor.extract(str(resolve_stored_resume_path(resume.path)))
		extracted = language_extractor.extract_languages(raw_text)
		lang_count = len(extracted.get("languages", []))
		_update_job_status(db, language_job_id, current_user.id, "completed", f"Found {lang_count} language(s)")
	except UnsupportedFileTypeError as e:
		_update_job_status(db, language_job_id, current_user.id, "failed", f"Failed to extract languages: {str(e)}")
		raise HTTPException(
			status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
			detail=str(e) + ", allowed: pdf, docx",
		)

	analysis = ResumeLanguageAnalysisRead.model_validate(
		{
			"sections": extracted.get("sections", []),
			"languages": extracted.get("languages", []),
			"stats": extracted.get("stats", {}),
		}
	)
	candidat = CandidatRepository.get_by_resume_id(db, resume.id)
	if candidat is not None:
		stored = LanguageRepository.replace_for_candidate(
			db,
			candidat_id=candidat.id,
			languages=analysis.languages,
		)
		analysis.stats["persisted_count"] = len(stored)
	else:
		analysis.stats["persisted_count"] = 0
		analysis.stats["persistence_reason"] = "candidate_identity_not_extracted"

	_create_notification(
		background_tasks,
		NotificationService.language_extraction_completed,
		db,
		recruiter_id=current_user.id,
		language_count=lang_count,
	)
	return ResumeLanguageRead(raw_text=raw_text, analysis=analysis)


@router.patch('/{resume_id}/candidat', status_code=status.HTTP_200_OK)
def update_candidat(
	resume_id: int,
	payload: CandidatUpdateSchema,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	resume = get_resume_detail(db, resume_id, recruiter_id=current_user.id)
	candidat = db.query(Candidat).filter(Candidat.resume_id == resume.id).first()
	if not candidat:
		raise HTTPException(status_code=404, detail="No candidate found for this resume")
	if payload.fullname is not None:
		candidat.fullname = payload.fullname
	if payload.email is not None:
		candidat.email = payload.email
	if payload.phone is not None:
		candidat.phone = payload.phone
	db.commit()
	db.refresh(candidat)
	return {"status": "success", "message": "Candidate updated"}


@router.patch('/experience/{experience_id}', status_code=status.HTTP_200_OK)
def update_experience(
	experience_id: int,
	payload: ExperienceUpdateSchema,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	from app.models.experience import Experience
	from datetime import datetime
	exp = db.query(Experience).filter(Experience.id == experience_id).first()
	if not exp:
		raise HTTPException(status_code=404, detail="Experience not found")
	if payload.title is not None:
		exp.title = payload.title
	if payload.description is not None:
		exp.description = payload.description
	if payload.start_date is not None:
		exp.start_date = datetime.strptime(payload.start_date, "%Y-%m-%d") if payload.start_date else None
	if payload.end_date is not None:
		exp.end_date = datetime.strptime(payload.end_date, "%Y-%m-%d") if payload.end_date else None
	db.commit()
	return {"status": "success", "message": "Experience updated"}


@router.patch('/education/{education_id}', status_code=status.HTTP_200_OK)
def update_education(
	education_id: int,
	payload: EducationUpdateSchema,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	from app.models.education import Education
	from datetime import datetime
	edu = db.query(Education).filter(Education.id == education_id).first()
	if not edu:
		raise HTTPException(status_code=404, detail="Education not found")
	if payload.institution is not None:
		edu.institution = payload.institution 
	if payload.degree is not None:
		edu.degree = payload.degree
	if payload.field_of_study is not None:
		edu.field_of_study = payload.field_of_study
	if payload.start_date is not None:
		edu.start_date = datetime.strptime(payload.start_date, "%Y-%m-%d") if payload.start_date else None
	if payload.end_date is not None:
		edu.end_date = datetime.strptime(payload.end_date, "%Y-%m-%d") if payload.end_date else None
	if payload.description is not None:
		edu.description = payload.description
	db.commit()
	return {"status": "success", "message": "Education updated"}


@router.patch('/certification/{certification_id}', status_code=status.HTTP_200_OK)
def update_certification(
	certification_id: int,
	payload: CertificationUpdateSchema,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	from app.models.certification import Certification
	from datetime import datetime
	cert = db.query(Certification).filter(Certification.id == certification_id).first()
	if not cert:
		raise HTTPException(status_code=404, detail="Certification not found")
	if payload.name is not None:
		cert.name = payload.name
	if payload.organization is not None:
		cert.organization = payload.organization
	if payload.issue_date is not None:
		cert.issue_date = datetime.strptime(payload.issue_date, "%Y-%m-%d") if payload.issue_date else None
	if payload.expiration_date is not None:
		cert.expiration_date = datetime.strptime(payload.expiration_date, "%Y-%m-%d") if payload.expiration_date else None
	if payload.credential_id is not None:
		cert.credential_id = payload.credential_id
	if payload.credential_url is not None:
		cert.credential_url = payload.credential_url
	if payload.description is not None:
		cert.description = payload.description
	db.commit()
	return {"status": "success", "message": "Certification updated"}


@router.get('/', response_model=List[DocumentListSchema], status_code=status.HTTP_200_OK)
def get_resumes(db: Session = Depends(get_db)):
    return get_resumes_list(db)

@router.get('/{resume_id}', response_model=ResumeFullDetailSchema | None, status_code=status.HTTP_200_OK)
def get_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    return get_full_resume_detail(db, resume_id, recruiter_id=current_user.id)

@router.get('/{resume_id}/download', status_code=status.HTTP_200_OK)
def download_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    resume = get_resume_detail(db, resume_id, recruiter_id=current_user.id)
    file_path = resolve_stored_resume_path(resume.path)
    return FileResponse(path=file_path, filename=Path(resume.path).name)

@router.delete('/{resume_id}', status_code=status.HTTP_200_OK)
def delete_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return delete_resume_and_file(db, resume_id, recruiter_id=current_user.id)


from fastapi.responses import Response

@router.get('/{resume_id}/preview', status_code=status.HTTP_200_OK)
def preview_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    resume = get_resume_detail(db, resume_id, recruiter_id=current_user.id)
    file_path = resolve_stored_resume_path(resume.path)
    
    try:
        import fitz
        pdf_doc = fitz.open(file_path)
        page = pdf_doc.load_page(0)
     
        pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
        return Response(content=pix.tobytes("png"), media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not generate preview")
