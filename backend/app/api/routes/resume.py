from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pathlib import Path
import shutil
import tempfile

from app.schemas.identity_extraction import ResumeIdentityRead
from app.schemas.resume import ResumeRead, ResumeTextRead
from app.schemas.skill_extraction import ResumeAnalysisRead, ResumeSkillAnalysisRead
from app.services.resume_extraction.extractor import TextExtractionService
from app.services.resume_extraction.extractor import UnsupportedFileTypeError
from app.services.identity_extraction.pipeline import ResumeIdentityPipeline
from app.services.skill_extraction.pipeline import PretrainedBilingualExtractor
router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeTextRead, status_code=status.HTTP_201_CREATED)
def upload_resume(file: UploadFile = File(...)):
	extractor = TextExtractionService()
	if not file.filename:
		raise HTTPException(status_code=400, detail="Resume file is required")

	file_suffix = Path(file.filename).suffix.lower()
	with tempfile.NamedTemporaryFile(delete=False, suffix=file_suffix) as temp_file:
		shutil.copyfileobj(file.file, temp_file)
		temp_path = temp_file.name

	try:
		raw_text = extractor.extract(temp_path)
	except UnsupportedFileTypeError as e:
		raise HTTPException(
			status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
			detail=str(e) + ", allowed: pdf, docx"
		)
	finally:
		Path(temp_path).unlink(missing_ok=True)

	return ResumeTextRead(raw_text=raw_text)


@router.post("/analyze", response_model=ResumeAnalysisRead, status_code=status.HTTP_200_OK)
def analyze_resume(file: UploadFile = File(...)):
	text_extractor = TextExtractionService()
	skill_extractor = PretrainedBilingualExtractor()
	if not file.filename:
		raise HTTPException(status_code=400, detail="Resume file is required")

	file_suffix = Path(file.filename).suffix.lower()
	with tempfile.NamedTemporaryFile(delete=False, suffix=file_suffix) as temp_file:
		shutil.copyfileobj(file.file, temp_file)
		temp_path = temp_file.name

	try:
		raw_text = text_extractor.extract(temp_path)
		analysis = skill_extractor.extract_skills(raw_text)
		# Convert pipeline output (SkillMention dicts) to API schema shape
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

		# Build converted analysis
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
	finally:
		Path(temp_path).unlink(missing_ok=True)

	return ResumeAnalysisRead(raw_text=raw_text, analysis=ResumeSkillAnalysisRead.model_validate(converted))


@router.post("/identity", response_model=ResumeIdentityRead, status_code=status.HTTP_200_OK)
def extract_identity(file: UploadFile = File(...)):
	text_extractor = TextExtractionService()
	identity_extractor = ResumeIdentityPipeline()
	if not file.filename:
		raise HTTPException(status_code=400, detail="Resume file is required")

	file_suffix = Path(file.filename).suffix.lower()
	with tempfile.NamedTemporaryFile(delete=False, suffix=file_suffix) as temp_file:
		shutil.copyfileobj(file.file, temp_file)
		temp_path = temp_file.name

	try:
		raw_text = text_extractor.extract(temp_path)
		identity = identity_extractor.analyze(raw_text)
	except UnsupportedFileTypeError as e:
		raise HTTPException(
			status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
			detail=str(e) + ", allowed: pdf, docx",
		)
	finally:
		Path(temp_path).unlink(missing_ok=True)

	return ResumeIdentityRead.model_validate(identity)