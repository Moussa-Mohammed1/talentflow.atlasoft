from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.job_offers import JobOfferCreate, JobOfferGenerate, JobOfferRead, JobOfferUpdate
from app.services.job_offers_generation_service import JobOffersGenerationService
from app.services.job_offers_service import JobOffersService

router = APIRouter(prefix="/job-offers", tags=["Job Offers"])


@router.get("", response_model=list[JobOfferRead])
def list_job_offers(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[JobOfferRead]:
    service = JobOffersService(db)
    return service.list_all(skip, limit)


@router.post("", response_model=JobOfferRead, status_code=status.HTTP_201_CREATED)
def create_job_offer(
    job_in: JobOfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobOfferRead:
    service = JobOffersService(db)
    return service.create(job_in)


@router.post("/generate", response_model=JobOfferRead, status_code=status.HTTP_201_CREATED)
def generate_job_offer(
    job_in: JobOfferGenerate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobOfferRead:
    service = JobOffersGenerationService(db, recruiter_id=current_user.id)
    return service.generate_from_description(job_in.description)


@router.get("/{job_id}", response_model=JobOfferRead)
def get_job_offer(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobOfferRead:
    service = JobOffersService(db)
    job = service.get_by_id(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job offer not found")
    return job


@router.patch("/{job_id}", response_model=JobOfferRead)
def update_job_offer(
    job_id: UUID,
    job_in: JobOfferUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobOfferRead:
    service = JobOffersService(db)
    job = service.update(job_id, job_in)
    if job is None:
        raise HTTPException(status_code=404, detail="Job offer not found")
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_offer(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    service = JobOffersService(db)
    deleted = service.delete(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job offer not found")
