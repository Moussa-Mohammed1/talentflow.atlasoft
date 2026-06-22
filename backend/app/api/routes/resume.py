from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pathlib import Path
from typing import List

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.repositories.candidat_repository import CandidatRepository
from app.schemas.identity_extraction import ResumeIdentityRead
from app.schemas.resume import ResumePathRequest, ResumeRead, ResumeTextRead, DocumentListSchema, ResumeDetailSchema
from app.schemas.skill_extraction import ResumeAnalysisRead, ResumeSkillAnalysisRead
from app.services.resume_service import create_resume, get_resume_by_path, resolve_stored_resume_path, get_resumes_list, get_resume_detail, delete_resume_and_file
from app.services.resume_extraction.extractor import TextExtractionService
from app.services.resume_extraction.extractor import UnsupportedFileTypeError
from app.services.identity_extraction.pipeline import ResumeIdentityPipeline
from app.services.skill_extraction.pipeline import PretrainedBilingualExtractor
router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeRead, status_code=status.HTTP_201_CREATED)
def upload_resume(
	file: UploadFile = File(...),
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	print("=== REQUEST RECEIVED === /upload", flush=True)
	return create_resume(file=file, recruiter_id=current_user.id, db=db)


@router.post("/analyze", response_model=ResumeAnalysisRead, status_code=status.HTTP_200_OK)
def analyze_resume(
	payload: ResumePathRequest,
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
		raise HTTPException(
			status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
			detail=str(e) + ", allowed: pdf, docx",
		)

	return ResumeAnalysisRead(raw_text=raw_text, analysis=ResumeSkillAnalysisRead.model_validate(converted))


@router.post("/identity", response_model=ResumeIdentityRead, status_code=status.HTTP_200_OK)
def extract_identity(
	payload: ResumePathRequest,
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
	CandidatRepository.upsert_from_identity(db, resume_id=resume.id, identity=validated_identity)
	return validated_identity

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
