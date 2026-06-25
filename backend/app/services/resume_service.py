from datetime import datetime
from fastapi import HTTPException, UploadFile
from pathlib import Path
import shutil
import uuid

from sqlalchemy.orm import Session

from app.models.resume import Resume
from app.models.candidat import Candidat
from app.models.experience import Experience
from app.models.education import Education
from app.models.certification import Certification
from app.models.candidat_skill import CandidatSkills
from app.models.skills import Skills
from app.models.skills_category import SkillsCategory
from app.models.candidat_language import CandidatLanguages
from app.models.language import Language


# UPLOAD_DIR = Path(__file__).resolve().parents[2] / "storage" / "resumes"
UPLOAD_DIR = Path("storage/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file extensions and MIME types for resumes
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
ALLOWED_CONTENT_TYPES = {
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def create_resume(file: UploadFile, recruiter_id: int, db: Session) -> Resume:
	if not file.filename:
		raise HTTPException(status_code=400, detail="Resume file is required")

	# Validate file extension and content type
	file_ext = Path(file.filename).suffix.lower()
	content_type = (file.content_type or "").lower()
	if file_ext not in ALLOWED_EXTENSIONS or content_type not in ALLOWED_CONTENT_TYPES:
		raise HTTPException(
			status_code=400,
			detail="Invalid file type. Only PDF and DOCX files are accepted.",
		)

	unique_name = f"{uuid.uuid4()}-{Path(file.filename).name}"
	file_path = UPLOAD_DIR / unique_name

	with file_path.open("wb") as buffer:
		shutil.copyfileobj(file.file, buffer)

	resume = Resume(path=str(file_path), recruiter_id=recruiter_id)
	db.add(resume)
	db.commit()
	db.refresh(resume)
	return resume


def get_resume_by_path(path: str, recruiter_id: int, db: Session) -> Resume | None:
	return (
		db.query(Resume)
		.filter(Resume.path == path, Resume.recruiter_id == recruiter_id)
		.first()
	)

def get_resume_by_id(resume_id: int, recruiter_id: int, db: Session) -> Resume | None:
     return (
          db.query(Resume)
          .filter(Resume.id == resume_id, Resume.recruiter_id == recruiter_id)
          .first()
     )


def resolve_stored_resume_path(path: str) -> Path:
	resume_path = Path(path)
	if not resume_path.is_absolute():
		resume_path = Path.cwd() / resume_path

	resolved_path = resume_path.resolve()
	resolved_upload_dir = UPLOAD_DIR.resolve()

	if resolved_upload_dir not in resolved_path.parents:
		raise HTTPException(status_code=400, detail="Resume path is outside resume storage")

	if not resolved_path.exists():
		raise HTTPException(status_code=404, detail="Stored resume file was not found")

	return resolved_path

import os
import random
from app.repositories.resumer_repository import ResumeRepository

def get_resumes_list(db: Session):
    
    records = ResumeRepository.get_all(db)
    
    docs = []

    for resume, candidat in records:
        
        try:
            size_bytes = os.path.getsize(resume.path)
            if size_bytes >= 1024 * 1024:
                file_size = f"{size_bytes / (1024 * 1024):.1f} MB"
            else:
                file_size = f"{size_bytes / 1024:.0f} KB"
        except OSError:
            file_size = "Unknown"
        

        
        file_name = Path(resume.path).name
        
        docs.append({
            "id": str(resume.id),
            "name": file_name,
            "candidateName": candidat.fullname if candidat else "Inconnu",
            "role": "Candidat" if candidat else "En cours de traitement", 
            "importDate": resume.created_at.strftime("%d/%m/%Y") if resume.created_at else "",
            "fileSize": file_size,
            "category": "PDF" if str(resume.path).lower().endswith(".pdf") else "DOCX",
            "previewUrl": f"/api/resumes/{resume.id}/preview"
        })
        
    return docs

def get_resume_detail(db: Session, resume_id: int, recruiter_id: int):
    resume = ResumeRepository.get_by_id(db, resume_id=resume_id, recruiter_id=recruiter_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    return resume


def get_full_resume_detail(db: Session, resume_id: int, recruiter_id: int):
    resume = ResumeRepository.get_by_id(db, resume_id=resume_id, recruiter_id=recruiter_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    candidat = db.query(Candidat).filter(Candidat.resume_id == resume.id).first()

    if candidat is None:
        return None

    experiences = db.query(Experience).filter(Experience.candidat_id == candidat.id).all()
    educations = db.query(Education).filter(Education.candidat_id == candidat.id).all()
    certifications = db.query(Certification).filter(Certification.candidat_id == candidat.id).all()

    skill_records = (
        db.query(Skills, SkillsCategory)
        .join(CandidatSkills, CandidatSkills.skill_id == Skills.id)
        .join(SkillsCategory, Skills.category_id == SkillsCategory.id)
        .filter(CandidatSkills.candidat_id == candidat.id)
        .all()
    )

    language_records = (
        db.query(Language)
        .join(CandidatLanguages, CandidatLanguages.language_id == Language.id)
        .filter(CandidatLanguages.candidat_id == candidat.id)
        .all()
    )

    from app.schemas.resume import ResumeFullDetailSchema, CandidatDetailSchema, ExperienceDetailSchema, EducationDetailSchema, CertificationDetailSchema, SkillDetailSchema, LanguageDetailSchema

    def fmt_date(dt: datetime | None) -> str | None:
        if dt is None:
            return None
        return dt.strftime("%Y-%m-%d")

    return ResumeFullDetailSchema(
        resume_id=resume.id,
        candidat=CandidatDetailSchema(
            id=candidat.id,
            fullname=candidat.fullname,
            email=candidat.email,
            phone=candidat.phone,
            created_at=candidat.created_at,
        ),
        experiences=[
            ExperienceDetailSchema(
                id=exp.id,
                title=exp.title or "",
                description=exp.description,
                start_date=fmt_date(exp.start_date) or "",
                end_date=fmt_date(exp.end_date),
            )
            for exp in experiences
        ],
        educations=[
            EducationDetailSchema(
                id=edu.id,
                institution=edu.institution or "",
                degree=edu.degree,
                field_of_study=edu.field_of_study,
                start_date=fmt_date(edu.start_date),
                end_date=fmt_date(edu.end_date),
                description=edu.description,
            )
            for edu in educations
        ],
        certifications=[
            CertificationDetailSchema(
                id=cert.id,
                name=cert.name or "",
                organization=cert.organization or "",
                issue_date=fmt_date(cert.issue_date),
                expiration_date=fmt_date(cert.expiration_date),
                credential_id=cert.credential_id,
                credential_url=cert.credential_url,
                description=cert.description,
            )
            for cert in certifications
        ],
        skills=[
            SkillDetailSchema(
                id=skill.id,
                name=skill.name,
                category_name=category.name,
            )
            for skill, category in skill_records
        ],
        languages=[
            LanguageDetailSchema(
                id=lang.id,
                name=lang.name or "",
            )
            for lang in language_records
        ],
    )

def delete_resume_and_file(db: Session, resume_id: int, recruiter_id: int):
    resume = ResumeRepository.get_by_id(db, resume_id=resume_id, recruiter_id=recruiter_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    ResumeRepository.delete(db, resume)
    
    file_path = Path(resume.path)
    if file_path.exists():
        file_path.unlink()
        
    return {"status": "success", "message": "Resume deleted"}
