from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.models.interview import Interview
from app.models.job_offers import JobOffers
from app.models.recruitment import Recruitment, RecruitmentStatus
from app.models.recruitment_email import RecruitmentEmail, EmailType
from app.models.user import User
from app.repositories.interview_repository import InterviewRepository
from app.repositories.recruitment_email_repository import RecruitmentEmailRepository
from app.repositories.recruitment_repository import RecruitmentRepository
from app.schemas.recruitment import (
    EmailPreviewRequest,
    EmailPreviewResponse,
    InterviewCreate,
    InterviewRead,
    InterviewUpdate,
    RecruitmentCreate,
    RecruitmentEmailRead,
    RecruitmentRead,
    RecruitmentUpdate,
    SendEmailRequest,
)
from app.services.LLM.generate_recruitment_email import RecruitmentEmailGenerator

logger = logging.getLogger(__name__)


class RecruitmentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RecruitmentRepository(db)
        self.interview_repo = InterviewRepository(db)
        self.email_repo = RecruitmentEmailRepository(db)

    def _build_recruitment_read(self, rec: Recruitment) -> RecruitmentRead:
        return RecruitmentRead.model_validate(rec)

    def create(self, data: RecruitmentCreate, current_user: User) -> RecruitmentRead:
        existing = self.repo.get_active_by_candidate_and_job(data.candidate_id, data.job_offer_id)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An active recruitment already exists for this candidate and job offer",
            )
        rec = self.repo.create(data, created_by=current_user.id)
        return self._build_recruitment_read(rec)

    def get_by_id(self, recruitment_id: UUID) -> dict[str, Any]:
        rec = self.repo.get_by_id(recruitment_id)
        if rec is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found")

        candidate = self.db.query(Candidat).filter(Candidat.id == rec.candidate_id).first()
        job_offer = self.db.query(JobOffers).filter(JobOffers.id == rec.job_offer_id).first()

        interviews = self.interview_repo.list_by_recruitment(recruitment_id)
        emails = self.email_repo.list_by_recruitment(recruitment_id)

        return {
            "recruitment": RecruitmentRead.model_validate(rec),
            "candidate": {
                "id": candidate.id,
                "fullname": candidate.fullname,
                "email": candidate.email,
                "phone": candidate.phone,
                "photo": candidate.photo,
            } if candidate else None,
            "job_offer": {
                "id": job_offer.id,
                "title": job_offer.title,
                "description": job_offer.description,
                "department_id": job_offer.department_id,
            } if job_offer else None,
            "interviews": [InterviewRead.model_validate(i) for i in interviews],
            "emails": [RecruitmentEmailRead.model_validate(e) for e in emails],
        }

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
    ) -> dict[str, Any]:
        records, total = self.repo.list(
            skip=skip,
            limit=limit,
            search=search,
            status=status,
            job_offer_id=job_offer_id,
            recruiter_id=recruiter_id,
            priority=priority,
            ordering=ordering,
        )

        items = []
        for rec in records:
            candidate = self.db.query(Candidat).filter(Candidat.id == rec.candidate_id).first()
            job_offer = self.db.query(JobOffers).filter(JobOffers.id == rec.job_offer_id).first()
            assigned_recruiter = None
            if rec.assigned_recruiter_id:
                assigned_recruiter = self.db.query(User).filter(User.id == rec.assigned_recruiter_id).first()

            items.append({
                "id": rec.id,
                "candidate_id": rec.candidate_id,
                "job_offer_id": rec.job_offer_id,
                "compatibility_score": float(rec.compatibility_score) if rec.compatibility_score else None,
                "status": rec.status.value if hasattr(rec.status, 'value') else rec.status,
                "priority": rec.priority.value if hasattr(rec.priority, 'value') else rec.priority,
                "assigned_recruiter_id": rec.assigned_recruiter_id,
                "notes": rec.notes,
                "created_at": rec.created_at.isoformat() if rec.created_at else None,
                "updated_at": rec.updated_at.isoformat() if rec.updated_at else None,
                "candidate": {
                    "id": candidate.id,
                    "fullname": candidate.fullname,
                    "email": candidate.email,
                    "phone": candidate.phone,
                    "photo": candidate.photo,
                } if candidate else None,
                "job_offer": {
                    "id": job_offer.id,
                    "title": job_offer.title,
                } if job_offer else None,
                "assigned_recruiter": {
                    "id": assigned_recruiter.id,
                    "fullname": assigned_recruiter.fullname,
                } if assigned_recruiter else None,
            })

        return {"items": items, "total": total}

    def update(self, recruitment_id: UUID, data: RecruitmentUpdate) -> RecruitmentRead:
        rec = self.repo.get_by_id(recruitment_id)
        if rec is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found")
        rec = self.repo.update(rec, data)
        return self._build_recruitment_read(rec)

    def delete(self, recruitment_id: UUID) -> None:
        rec = self.repo.get_by_id(recruitment_id)
        if rec is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found")
        self.repo.soft_delete(rec)

    def create_interview(self, recruitment_id: UUID, data: InterviewCreate) -> InterviewRead:
        rec = self.repo.get_by_id(recruitment_id)
        if rec is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found")

        if data.scheduled_at.tzinfo is None:
            scheduled_at = data.scheduled_at.replace(tzinfo=timezone.utc)
        else:
            scheduled_at = data.scheduled_at

        if scheduled_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Interview date must be in the future",
            )

        interview = self.interview_repo.create(recruitment_id, data)
        return InterviewRead.model_validate(interview)

    def list_interviews(self, recruitment_id: UUID) -> list[InterviewRead]:
        rec = self.repo.get_by_id(recruitment_id)
        if rec is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found")
        interviews = self.interview_repo.list_by_recruitment(recruitment_id)
        return [InterviewRead.model_validate(i) for i in interviews]

    def update_interview(self, interview_id: UUID, data: InterviewUpdate) -> InterviewRead:
        interview = self.interview_repo.get_by_id(interview_id)
        if interview is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

        if data.scheduled_at is not None:
            if data.scheduled_at.tzinfo is None:
                scheduled_at = data.scheduled_at.replace(tzinfo=timezone.utc)
            else:
                scheduled_at = data.scheduled_at
            if scheduled_at <= datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Interview date must be in the future",
                )

        interview = self.interview_repo.update(interview, data)
        return InterviewRead.model_validate(interview)

    def delete_interview(self, interview_id: UUID) -> None:
        interview = self.interview_repo.get_by_id(interview_id)
        if interview is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
        self.interview_repo.delete(interview)

    def preview_email(self, recruitment_id: UUID, data: EmailPreviewRequest) -> EmailPreviewResponse:
        rec = self.repo.get_by_id(recruitment_id)
        if rec is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found")

        candidate = self.db.query(Candidat).filter(Candidat.id == rec.candidate_id).first()
        job_offer = self.db.query(JobOffers).filter(JobOffers.id == rec.job_offer_id).first()

        variables = {
            "candidate_name": candidate.fullname if candidate else "Candidate",
            "company_name": data.company_name,
            "job_title": job_offer.title if job_offer else "Position",
            "interview_date": data.interview_date,
            "interview_time": data.interview_time,
            "duration_minutes": str(data.duration_minutes),
            "location": data.location or "TBD",
            "recruiter_name": data.recruiter_name,
            "language": data.language,
        }

        try:
            result = RecruitmentEmailGenerator.generate(variables)
            return EmailPreviewResponse(subject=result["subject"], body=result["body"])
        except Exception as e:
            logger.error(f"Failed to generate email: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate email preview",
            )

    def send_email(self, recruitment_id: UUID, data: SendEmailRequest, current_user: User) -> RecruitmentEmailRead:
        rec = self.repo.get_by_id(recruitment_id)
        if rec is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found")

        candidate = self.db.query(Candidat).filter(Candidat.id == rec.candidate_id).first()
        if candidate is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

        sender_email = os.getenv("MAIL_FROM", "")
        if not sender_email:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Company recruitment email not configured",
            )

        email = self.email_repo.create(
            recruitment_id=recruitment_id,
            email_type=EmailType.INTERVIEW_INVITATION,
            sender_email=sender_email,
            recipient_email=candidate.email,
            subject=data.subject,
            body=data.body,
        )

        try:
            from fastapi_mail import FastMail, MessageSchema
            from app.core.email import conf

            message = MessageSchema(
                subject=data.subject,
                recipients=[candidate.email],
                body=data.body,
                subtype="html",
            )
            fm = FastMail(conf)

            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(fm.send_message(message))
            finally:
                loop.close()

            email = self.email_repo.mark_sent(email, provider_message_id="sent")
        except Exception as e:
            logger.error(f"Failed to send email: {e}", exc_info=True)
            email = self.email_repo.mark_failed(email)

        if rec.status == RecruitmentStatus.PENDING:
            rec.status = RecruitmentStatus.INTERVIEW_INVITATION_SENT
            self.db.add(rec)
            self.db.commit()

        return RecruitmentEmailRead.model_validate(email)

    def list_emails(self, recruitment_id: UUID) -> list[RecruitmentEmailRead]:
        rec = self.repo.get_by_id(recruitment_id)
        if rec is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment not found")
        emails = self.email_repo.list_by_recruitment(recruitment_id)
        return [RecruitmentEmailRead.model_validate(e) for e in emails]
