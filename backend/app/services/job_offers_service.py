from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.job_offers import JobOffers
from app.repositories.job_offers_repository import JobOffersRepository
from app.schemas.job_offers import JobOfferCreate, JobOfferRead, JobOfferUpdate


class JobOffersService:
    def __init__(self, db: Session):
        self.repo = JobOffersRepository(db)

    def create(self, job_in: JobOfferCreate) -> JobOfferRead:
        job = self.repo.create(job_in)
        return JobOfferRead.model_validate(job)

    def get_by_id(self, job_id: UUID) -> JobOfferRead | None:
        job = self.repo.get_by_id(job_id)
        if job is None:
            return None
        return JobOfferRead.model_validate(job)

    def list_all(self, skip: int = 0, limit: int = 100) -> Sequence[JobOfferRead]:
        jobs = self.repo.list_all(skip, limit)
        return [JobOfferRead.model_validate(job) for job in jobs]

    def update(self, job_id: UUID, job_in: JobOfferUpdate) -> JobOfferRead | None:
        job = self.repo.get_by_id(job_id)
        if job is None:
            return None
        updated_job = self.repo.update(job, job_in)
        return JobOfferRead.model_validate(updated_job)

    def delete(self, job_id: UUID) -> bool:
        job = self.repo.get_by_id(job_id)
        if job is None:
            return False
        self.repo.delete(job)
        return True
