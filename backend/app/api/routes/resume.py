from __future__ import annotations

from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile, status
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.experience_extraction import ResumeExperienceRead
from app.schemas.identity_extraction import ResumeIdentityRead
from app.schemas.language_extraction import ResumeLanguageRead
from app.schemas.education_extraction import ResumeEducationRead
from app.schemas.certification_extraction import ResumeCertificationRead
from app.schemas.resume import (
    CandidatUpdateSchema,
    CertificationUpdateSchema,
    DocumentListSchema,
    EducationUpdateSchema,
    ExperienceUpdateSchema,
    ResumeFullDetailSchema,
    ResumeIdRequest,
    ResumePathRequest,
    ResumeRead,
)
from app.schemas.skill_extraction import ResumeAnalysisRead
from app.services.resume.resume_loader import ResumeLoader
from app.services.resume.analysis_service import ResumeAnalysisService
from app.services.resume.identity_service import ResumeIdentityService
from app.services.resume.experience_service import ResumeExperienceService
from app.services.resume.language_service import ResumeLanguageService
from app.services.resume.education_service import ResumeEducationService
from app.services.resume.certification_service import ResumeCertificationService
from app.services.resume.upload_service import ResumeUploadService
from app.services.resume.preview_service import ResumePreviewService
from app.services.resume.update_service import ResumeUpdateService
from app.services.resume_service import get_resumes_list, resolve_stored_resume_path, get_full_resume_detail, get_resume_detail

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeRead, status_code=status.HTTP_201_CREATED)
def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeUploadService.upload(db=db, recruiter_id=current_user.id, file=file, background_tasks=background_tasks)


@router.post("/analyze", response_model=ResumeAnalysisRead, status_code=status.HTTP_200_OK)
def analyze_resume(
    payload: ResumePathRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeAnalysisService.analyze(db=db, recruiter_id=current_user.id, background_tasks=background_tasks, path=payload.path)


@router.post("/re-analyze", response_model=ResumeAnalysisRead, status_code=status.HTTP_200_OK)
def re_analyze_resume(
    payload: ResumeIdRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeAnalysisService.reanalyze(db=db, recruiter_id=current_user.id, background_tasks=background_tasks, resume_id=payload.resume_id)


@router.post("/identity", response_model=ResumeIdentityRead, status_code=status.HTTP_200_OK)
def extract_identity(
    payload: ResumePathRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeIdentityService.extract(db=db, recruiter_id=current_user.id, background_tasks=background_tasks, path=payload.path)


@router.post("/{resume_id}/reanalyze-identity", response_model=ResumeIdentityRead, status_code=status.HTTP_200_OK)
def reanalyze_identity(
    resume_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeIdentityService.reanalyze(db=db, recruiter_id=current_user.id, background_tasks=background_tasks, resume_id=resume_id)


@router.post("/experience", response_model=ResumeExperienceRead, status_code=status.HTTP_200_OK)
def extract_experience(
    payload: ResumePathRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeExperienceService.extract(db=db, recruiter_id=current_user.id, path=payload.path)


@router.post("/language", response_model=ResumeLanguageRead, status_code=status.HTTP_200_OK)
def extract_language(
    payload: ResumePathRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeLanguageService.extract(db=db, recruiter_id=current_user.id, background_tasks=background_tasks, path=payload.path)


@router.post("/certification", response_model=ResumeCertificationRead, status_code=status.HTTP_200_OK)
def extract_certification(
    payload: ResumePathRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeCertificationService.extract(db=db, recruiter_id=current_user.id, path=payload.path)


@router.post("/education", response_model=ResumeEducationRead, status_code=status.HTTP_200_OK)
def extract_education(
    payload: ResumePathRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeEducationService.extract(db=db, recruiter_id=current_user.id, path=payload.path)


@router.patch("/{resume_id}/candidat", status_code=status.HTTP_200_OK)
def update_candidat(
    resume_id: int,
    payload: CandidatUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeUpdateService.update_candidat(db, resume_id, current_user.id, payload)


@router.patch("/experience/{experience_id}", status_code=status.HTTP_200_OK)
def update_experience(
    experience_id: int,
    payload: ExperienceUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeUpdateService.update_experience(db, experience_id, payload)


@router.patch("/education/{education_id}", status_code=status.HTTP_200_OK)
def update_education(
    education_id: int,
    payload: EducationUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeUpdateService.update_education(db, education_id, payload)


@router.patch("/certification/{certification_id}", status_code=status.HTTP_200_OK)
def update_certification(
    certification_id: int,
    payload: CertificationUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ResumeUpdateService.update_certification(db, certification_id, payload)


@router.get("/", response_model=List[DocumentListSchema], status_code=status.HTTP_200_OK)
def get_resumes(db: Session = Depends(get_db)):
    return get_resumes_list(db)


@router.get("/{resume_id}", response_model=ResumeFullDetailSchema | None, status_code=status.HTTP_200_OK)
def get_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_full_resume_detail(db, resume_id)


@router.get("/{resume_id}/download", status_code=status.HTTP_200_OK)
def download_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    resume = ResumeLoader.view_by_id(db, resume_id)
    file_path = resolve_stored_resume_path(resume.path)
    return FileResponse(path=file_path, filename=Path(resume.path).name)


@router.delete("/{resume_id}", status_code=status.HTTP_200_OK)
def delete_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return ResumeLoader.delete(db, resume_id, recruiter_id=current_user.id)


@router.get("/{resume_id}/preview", status_code=status.HTTP_200_OK)
def preview_resume(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return ResumePreviewService.generate(db, resume_id, current_user.id)
