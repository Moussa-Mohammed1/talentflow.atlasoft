from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.job_offers import JobOffers
from app.schemas.job_offers import JobOfferCreate, JobOfferUpdate


class JobOffersRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, job_in: JobOfferCreate) -> JobOffers:
        job = JobOffers(**job_in.model_dump())
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_by_id(self, job_id: UUID) -> JobOffers | None:
        stmt = select(JobOffers).where(JobOffers.id == job_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self, skip: int = 0, limit: int = 100) -> Sequence[JobOffers]:
        stmt = select(JobOffers).order_by(JobOffers.created_at.desc()).offset(skip).limit(limit)
        return self.db.execute(stmt).scalars().all()

    def update(self, job: JobOffers, job_in: JobOfferUpdate) -> JobOffers:
        update_data = job_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(job, field, value)
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def delete(self, job: JobOffers) -> None:
        self.db.delete(job)
        self.db.commit()
