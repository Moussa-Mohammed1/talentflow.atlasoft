import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pathlib import Path
from typing import List

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.repositories.candidat_repository import CandidatRepository
from app.repositories.experience_repository import ExperienceRepository
from app.schemas.experience_extraction import ResumeExperienceAnalysisRead, ResumeExperienceRead
from app.schemas.identity_extraction import ResumeIdentityRead
from app.schemas.resume import ResumePathRequest, ResumeRead, ResumeTextRead, DocumentListSchema, ResumeDetailSchema
from app.schemas.skill_extraction import ResumeAnalysisRead, ResumeSkillAnalysisRead
from app.services.resume_service import create_resume, get_resume_by_path, resolve_stored_resume_path, get_resumes_list, get_resume_detail, delete_resume_and_file
from app.services.resume_extraction.extractor import TextExtractionService
from app.services.resume_extraction.extractor import UnsupportedFileTypeError
from app.services.identity_extraction.pipeline import ResumeIdentityPipeline
from app.services.experience_extraction.pipeline import PretrainedBilingualExperienceExtractor
from app.services.skill_extraction.pipeline import PretrainedBilingualExtractor
from app.services.notification_manager import notification_manager
from app.services.notification_service import NotificationService
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
	resume = get_resume_by_path(path=payload.path, recruiter_id=current_user.id, db=db)
	if resume is None:
		raise HTTPException(status_code=404, detail="Resume was not found for this recruiter")

	try:
		raw_text = text_extractor.extract(str(resolve_stored_resume_path(resume.path)))
		analysis = skill_extractor.extract_skills(raw_text)
	
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

		converted = {
			"sections": analysis.get("sections", []),
			"technologies": [_convert_mention(m) for m in analysis.get("technologies", [])],
			"competencies": [_convert_mention(m) for m in analysis.get("competencies", [])],
			"skills_by_category": {
				cat: [_convert_mention(m) for m in items]
				for cat, items in (analysis.get("skills_by_category") or {}).items()
			},
			"flattened_skills": [s.get("normalized") or s.get("original") for s in analysis.get("skills", [])],
		}
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
		analysis=ResumeSkillAnalysisRead.model_validate(converted),
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

	try:
		raw_text = text_extractor.extract(str(resolve_stored_resume_path(resume.path)))
		identity = identity_extractor.analyze(raw_text)
	except UnsupportedFileTypeError as e:
		raise HTTPException(
			status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
			detail=str(e) + ", allowed: pdf, docx",
		)
	validated_identity = ResumeIdentityRead.model_validate(identity)
	email = (validated_identity.email.value or "").strip()
	phone = (validated_identity.phone.value or "").strip()
	duplicate = CandidatRepository.check_duplicate(db, email, phone)
	if duplicate is not None:
		if duplicate.resume_id != resume.id:
			delete_resume_and_file(
				db,
				resume_id=resume.id,
				recruiter_id=current_user.id,
			)
			detail = (
				"Duplicate candidate: this identity already belongs to another "
				"resume; the new resume was deleted."
			)
		else:
			detail = "Duplicate candidate: this identity is already saved for this resume."

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

	try:
		raw_text = text_extractor.extract(str(resolve_stored_resume_path(resume.path)))
		extracted = experience_extractor.extract_experiences(raw_text)
	except UnsupportedFileTypeError as e:
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

@router.get('/', response_model=List[DocumentListSchema], status_code=status.HTTP_200_OK)
def get_resumes(db: Session = Depends(get_db)):
    return get_resumes_list(db)

@router.get('/{resume_id}', status_code=status.HTTP_200_OK)
def get_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    return get_resume_detail(db, resume_id, recruiter_id=current_user.id)

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
