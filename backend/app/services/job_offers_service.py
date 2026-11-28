from __future__ import annotations

import logging
from typing import Sequence
from uuid import UUID

from sqlalchemy.orm import Session

from app.repositories.job_offers_repository import JobOffersRepository
from app.schemas.job_offers import JobOfferCreate, JobOfferRead, JobOfferUpdate
from app.services.embeddings.indexer import EmbeddingIndexService

logger = logging.getLogger("talentflow.job_offers")


class JobOffersService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = JobOffersRepository(db)

    def _index_offer(self, job_id: UUID) -> None:
        try:
            EmbeddingIndexService().index_job_offer(self.db, job_id)
        except Exception as exc:
            logger.warning("Job offer embedding indexing skipped for job_id=%s: %s", job_id, exc)
            self.db.rollback()

    def create(self, job_in: JobOfferCreate) -> JobOfferRead:
        job = self.repo.create(job_in)
        self._index_offer(job.id)
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
        self._index_offer(updated_job.id)
        return JobOfferRead.model_validate(updated_job)

    def delete(self, job_id: UUID) -> bool:
        job = self.repo.get_by_id(job_id)
        if job is None:
            return False
        self.repo.delete(job)
        return True
