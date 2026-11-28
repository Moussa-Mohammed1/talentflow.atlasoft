from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.candidat import Candidat
from app.models.job_offers import JobOffers
from app.models.user import User
from app.schemas.matching import (
    CandidateSearchFilters,
    HybridMatchRequest,
    HybridMatchResponse,
    ReindexEmbeddingResponse,
)
from app.services.embeddings.indexer import EmbeddingIndexService
from app.services.matching.hybrid_matcher import HybridMatchingService

router = APIRouter(prefix="/matching", tags=["Matching"])


@router.post("/candidates", response_model=HybridMatchResponse)
def match_candidates(
    payload: HybridMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HybridMatchResponse:
    service = HybridMatchingService(db)
    return service.match_candidates(payload)


@router.get("/job-offers/{job_offer_id}/candidates", response_model=HybridMatchResponse)
def match_candidates_for_job_offer(
    job_offer_id: UUID,
    role: str | None = Query(default=None),
    location: str | None = Query(default=None),
    min_experience_years: float | None = Query(default=None, ge=0.0),
    skills: list[str] = Query(default=[]),
    match_all_skills: bool = Query(default=False),
    is_talent_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    semantic_weight: float = Query(default=0.55, ge=0.0, le=1.0),
    structured_weight: float = Query(default=0.45, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HybridMatchResponse:
    filters = CandidateSearchFilters(
        role=role,
        location=location,
        min_experience_years=min_experience_years,
        skills=skills,
        match_all_skills=match_all_skills,
        is_talent_only=is_talent_only,
    )
    service = HybridMatchingService(db)
    return service.match_for_job_offer(
        job_offer_id,
        filters=filters,
        limit=limit,
        semantic_weight=semantic_weight,
        structured_weight=structured_weight,
    )


@router.post(
    "/reindex/candidate/{candidate_id}",
    response_model=ReindexEmbeddingResponse,
    status_code=status.HTTP_200_OK,
)
def reindex_candidate_embeddings(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReindexEmbeddingResponse:
    candidate = db.query(Candidat).filter(Candidat.id == candidate_id).first()
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )
    records = EmbeddingIndexService().index_candidate(db, candidate_id)
    model_name = records[0].model_name if records else ""
    return ReindexEmbeddingResponse(
        entity_type="candidate",
        entity_id=str(candidate_id),
        chunks_indexed=len(records),
        model_name=model_name,
    )


@router.post(
    "/reindex/job-offer/{job_offer_id}",
    response_model=ReindexEmbeddingResponse,
    status_code=status.HTTP_200_OK,
)
def reindex_job_offer_embedding(
    job_offer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReindexEmbeddingResponse:
    offer = db.query(JobOffers).filter(JobOffers.id == job_offer_id).first()
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job offer not found",
        )
    record = EmbeddingIndexService().index_job_offer(db, job_offer_id)
    return ReindexEmbeddingResponse(
        entity_type="job_offer",
        entity_id=str(job_offer_id),
        chunks_indexed=1 if record else 0,
        model_name=record.model_name if record else "",
    )
