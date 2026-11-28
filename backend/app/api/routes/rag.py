from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.rag import (
    GroundedCandidateSummaryResponse,
    GroundedContextBundle,
    GroundedDraftRequest,
    GroundedDraftResponse,
    GroundedSummaryRequest,
    RetrieveContextRequest,
)
from app.services.rag.generator import GroundedRAGService
from app.services.rag.retriever import GroundedContextRetriever

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/retrieve-context", response_model=GroundedContextBundle)
def retrieve_grounded_context(
    payload: RetrieveContextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GroundedContextBundle:
    retriever = GroundedContextRetriever(db)
    return retriever.retrieve(
        candidate_id=payload.candidate_id,
        job_offer_id=payload.job_offer_id,
        focus_query=payload.focus_query,
        top_k_chunks=payload.top_k_chunks,
        recruiter_id=current_user.id,
    )


@router.post("/candidate-summary", response_model=GroundedCandidateSummaryResponse)
def generate_grounded_candidate_summary(
    payload: GroundedSummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GroundedCandidateSummaryResponse:
    service = GroundedRAGService(db)
    return service.generate_candidate_summary(payload, recruiter_id=current_user.id)


@router.post("/draft-email", response_model=GroundedDraftResponse)
def generate_grounded_email_draft(
    payload: GroundedDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GroundedDraftResponse:
    service = GroundedRAGService(db)
    return service.draft_grounded_email(payload, recruiter_id=current_user.id)
