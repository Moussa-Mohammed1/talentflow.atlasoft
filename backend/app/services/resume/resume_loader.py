from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.resume import Resume
from app.services.resume_service import (
    get_resume_by_path,
    get_resume_by_id,
    get_resume_detail,
    get_full_resume_detail,
    delete_resume_and_file,
    resolve_stored_resume_path,
)
from app.models.user import User


class ResumeLoader:
    """Resume loading with consistent error handling."""

    @staticmethod
    def by_path(db: Session, path: str, recruiter_id: int) -> Resume:
        resume = get_resume_by_path(path=path, recruiter_id=recruiter_id, db=db)
        if resume is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume was not found for this recruiter")
        return resume

    @staticmethod
    def by_id(db: Session, resume_id: int, recruiter_id: int) -> Resume:
        resume = get_resume_by_id(resume_id=resume_id, recruiter_id=recruiter_id, db=db)
        if resume is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume was not found for this recruiter")
        return resume

    @staticmethod
    def detail(db: Session, resume_id: int, recruiter_id: int):
        return get_resume_detail(db, resume_id, recruiter_id=recruiter_id)

    @staticmethod
    def full_detail(db: Session, resume_id: int, recruiter_id: int):
        return get_full_resume_detail(db, resume_id, recruiter_id=recruiter_id)

    @staticmethod
    def delete(db: Session, resume_id: int, recruiter_id: int):
        return delete_resume_and_file(db, resume_id, recruiter_id=recruiter_id)

    @staticmethod
    def view_by_id(db: Session, resume_id: int) -> Resume:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if resume is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        return resume

    @staticmethod
    def resolve_path(path: str) -> Path:
        return resolve_stored_resume_path(path)
