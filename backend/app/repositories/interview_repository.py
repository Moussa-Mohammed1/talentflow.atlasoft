from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.interview import Interview
from app.schemas.recruitment import InterviewCreate, InterviewUpdate


class InterviewRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, recruitment_id: UUID, data: InterviewCreate) -> Interview:
        interview = Interview(
            recruitment_id=recruitment_id,
            title=data.title,
            interview_type=data.interview_type,
            scheduled_at=data.scheduled_at,
            duration_minutes=data.duration_minutes,
            location=data.location,
            interviewer_name=data.interviewer_name,
        )
        self.db.add(interview)
        self.db.commit()
        self.db.refresh(interview)
        return interview

    def get_by_id(self, interview_id: UUID) -> Interview | None:
        stmt = select(Interview).where(Interview.id == interview_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_by_recruitment(self, recruitment_id: UUID) -> Sequence[Interview]:
        stmt = (
            select(Interview)
            .where(Interview.recruitment_id == recruitment_id)
            .order_by(Interview.scheduled_at.desc())
        )
        return self.db.execute(stmt).scalars().all()

    def update(self, interview: Interview, data: InterviewUpdate) -> Interview:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(interview, field, value)
        self.db.add(interview)
        self.db.commit()
        self.db.refresh(interview)
        return interview

    def delete(self, interview: Interview) -> None:
        self.db.delete(interview)
        self.db.commit()
