from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
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
from app.services.recruitment_service import RecruitmentService

router = APIRouter(prefix="/recruitments", tags=["Recruitments"])


@router.get("")
def list_recruitments(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    job_offer_id: UUID | None = Query(default=None),
    recruiter_id: int | None = Query(default=None),
    priority: str | None = Query(default=None),
    ordering: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.list(
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        job_offer_id=job_offer_id,
        recruiter_id=recruiter_id,
        priority=priority,
        ordering=ordering,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_recruitment(
    payload: RecruitmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.create(payload, current_user)


@router.get("/{recruitment_id}")
def get_recruitment(
    recruitment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.get_by_id(recruitment_id)


@router.patch("/{recruitment_id}")
def update_recruitment(
    recruitment_id: UUID,
    payload: RecruitmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.update(recruitment_id, payload)


@router.delete("/{recruitment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recruitment(
    recruitment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    service.delete(recruitment_id)


@router.post("/{recruitment_id}/interviews", status_code=status.HTTP_201_CREATED, response_model=InterviewRead)
def create_interview(
    recruitment_id: UUID,
    payload: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.create_interview(recruitment_id, payload)


@router.get("/{recruitment_id}/interviews", response_model=list[InterviewRead])
def list_interviews(
    recruitment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.list_interviews(recruitment_id)


@router.patch("/interviews/{interview_id}", response_model=InterviewRead)
def update_interview(
    interview_id: UUID,
    payload: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.update_interview(interview_id, payload)


@router.delete("/interviews/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(
    interview_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    service.delete_interview(interview_id)


@router.post("/{recruitment_id}/preview-email", response_model=EmailPreviewResponse)
def preview_email(
    recruitment_id: UUID,
    payload: EmailPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.preview_email(recruitment_id, payload, recruiter_id=current_user.id)


@router.post("/{recruitment_id}/send-email", response_model=RecruitmentEmailRead)
def send_email(
    recruitment_id: UUID,
    payload: SendEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.send_email(recruitment_id, payload, current_user)


@router.get("/{recruitment_id}/emails", response_model=list[RecruitmentEmailRead])
def list_emails(
    recruitment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.list_emails(recruitment_id)


@router.post("/{recruitment_id}/cancel", response_model=RecruitmentRead)
def cancel_recruitment(
    recruitment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RecruitmentService(db)
    return service.cancel_recruitment(recruitment_id)
