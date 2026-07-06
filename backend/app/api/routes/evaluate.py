from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.candidat import Candidat
from app.models.user import User
from app.schemas.evaluate import (
    EvaluateRequest,
    EvaluateResponse,
    EvaluatedCandidateCard,
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
            detail="Candidate not found",
        )
    candidate.is_talent = payload.is_talent
    db.commit()
    db.refresh(candidate)
    return {"status": "success", "is_talent": candidate.is_talent}
