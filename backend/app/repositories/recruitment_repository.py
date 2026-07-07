from __future__ import annotations

from datetime import datetime
from typing import Sequence
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.models.recruitment import Recruitment
from app.schemas.recruitment import RecruitmentCreate, RecruitmentUpdate


class RecruitmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: RecruitmentCreate, created_by: int) -> Recruitment:
        rec = Recruitment(
            candidate_id=data.candidate_id,
            job_offer_id=data.job_offer_id,
            priority=data.priority,
            notes=data.notes,
            created_by=created_by,
        )
        self.db.add(rec)
        self.db.commit()
        self.db.refresh(rec)
        return rec

    def get_by_id(self, recruitment_id: UUID) -> Recruitment | None:
        stmt = select(Recruitment).where(
            Recruitment.id == recruitment_id,
            Recruitment.deleted_at.is_(None),
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_active_by_candidate_and_job(self, candidate_id: int, job_offer_id: UUID) -> Recruitment | None:
        stmt = select(Recruitment).where(
            Recruitment.candidate_id == candidate_id,
            Recruitment.job_offer_id == job_offer_id,
            Recruitment.deleted_at.is_(None),
            ~Recruitment.status.in_(["cancelled", "candidate_declined", "offer_rejected"]),
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list(
        self,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        status: str | None = None,
        job_offer_id: UUID | None = None,
        recruiter_id: int | None = None,
        priority: str | None = None,
        ordering: str | None = None,
    ) -> tuple[Sequence[Recruitment], int]:
        query = select(Recruitment).where(Recruitment.deleted_at.is_(None))

        if status:
            query = query.where(Recruitment.status == status)
        if job_offer_id:
            query = query.where(Recruitment.job_offer_id == job_offer_id)
        if recruiter_id:
            query = query.where(Recruitment.assigned_recruiter_id == recruiter_id)
        if priority:
            query = query.where(Recruitment.priority == priority)

        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0

        if ordering:
            if ordering.startswith("-"):
                field = getattr(Recruitment, ordering[1:], None)
                if field is not None:
                    query = query.order_by(field.desc())
            else:
                field = getattr(Recruitment, ordering, None)
                if field is not None:
                    query = query.order_by(field.asc())
        else:
            query = query.order_by(Recruitment.created_at.desc())

        query = query.offset(skip).limit(limit)
        results = self.db.execute(query).scalars().all()

        return results, total

    def update(self, recruitment: Recruitment, data: RecruitmentUpdate) -> Recruitment:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(recruitment, field, value)
        recruitment.updated_at = datetime.utcnow()
        self.db.add(recruitment)
        self.db.commit()
        self.db.refresh(recruitment)
        return recruitment

    def soft_delete(self, recruitment: Recruitment) -> None:
        recruitment.deleted_at = datetime.utcnow()
        recruitment.updated_at = datetime.utcnow()
        self.db.add(recruitment)
        self.db.commit()
