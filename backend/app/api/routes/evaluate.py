from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.evaluate import (
    EvaluateRequest,
    EvaluateResponse,
    EvaluatedCandidateCard,
)
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/evaluate", tags=["Evaluate"])


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
