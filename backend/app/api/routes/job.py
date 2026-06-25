from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.job import JobCreate, JobListRead, JobRead, JobStatusUpdate
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=JobListRead)
def list_jobs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobListRead:
    service = JobService(db)
    return service.list_jobs(current_user.id, limit, offset)


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobRead:
    if job_in.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot create jobs for other recruiters")
    service = JobService(db)
    return service.create_job(job_in)


@router.patch("/{job_id}/status", response_model=JobRead)
def update_job_status(
    job_id: int,
    update_in: JobStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobRead:
    service = JobService(db)
    job = service.update_job_status(job_id, current_user.id, update_in)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/start", response_model=JobRead)
def start_job(
    job_id: int,
    message: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobRead:
    service = JobService(db)
    job = service.start_job(job_id, current_user.id, message)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/complete", response_model=JobRead)
def complete_job(
    job_id: int,
    message: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobRead:
    service = JobService(db)
    job = service.complete_job(job_id, current_user.id, message)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/fail", response_model=JobRead)
def fail_job(
    job_id: int,
    message: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobRead:
    service = JobService(db)
    job = service.fail_job(job_id, current_user.id, message)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job