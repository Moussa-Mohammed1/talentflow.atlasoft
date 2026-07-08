from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.candidat import Candidat
from app.models.user import User
from app.schemas.evaluate import (
    DepartmentEvaluation,
    DepartmentScore,
    EvaluateRequest,
    EvaluateResponse,
    EvaluatedCandidateCard,
    TalentCard,
)
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/evaluate", tags=["Evaluate"])


class TalentToggleRequest(BaseModel):
    is_talent: bool


@router.get("/evaluated", response_model=list[EvaluatedCandidateCard])
def get_evaluated_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EvaluatedCandidateCard]:
    service = EvaluationService(db)
    return service.get_evaluated_candidates()


@router.get("/{candidate_id}/results", response_model=list[DepartmentEvaluation])
def get_evaluation_results(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DepartmentEvaluation]:
    service = EvaluationService(db)
    return service.get_results(candidate_id)


@router.post("", response_model=EvaluateResponse)
def evaluate_candidate(
    payload: EvaluateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EvaluateResponse:
    service = EvaluationService(db)
    return service.evaluate(payload.candidate_id)


@router.patch("/{candidate_id}/talent")
def toggle_talent(
    candidate_id: int,
    payload: TalentToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    candidate = db.query(Candidat).filter(Candidat.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidat introuvable",
        )
    candidate.is_talent = payload.is_talent
    if payload.is_talent:
        candidate.talent_date = datetime.now(timezone.utc)
        candidate.talent_recruiter_id = current_user.id
    else:
        candidate.talent_date = None
        candidate.talent_recruiter_id = None
    db.commit()
    db.refresh(candidate)
    return {"status": "success", "is_talent": candidate.is_talent}


@router.get("/{candidate_id}/department-scores", response_model=list[DepartmentScore])
def get_candidate_department_scores(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DepartmentScore]:
    service = EvaluationService(db)
    return service.get_department_scores(candidate_id)


@router.get("/talents", response_model=list[TalentCard])
def get_talents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TalentCard]:
    service = EvaluationService(db)
    return service.get_talents()
