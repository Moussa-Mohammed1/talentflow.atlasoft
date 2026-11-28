from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class CandidateSearchFilters(BaseModel):
    """Structured relational filters applied alongside pgvector similarity."""

    role: str | None = None
    min_experience_years: float | None = Field(default=None, ge=0.0)
    max_experience_years: float | None = Field(default=None, ge=0.0)
    skills: list[str] = Field(default_factory=list)
    match_all_skills: bool = False
    location: str | None = None
    languages: list[str] = Field(default_factory=list)
    is_talent_only: bool = False


class HybridMatchRequest(BaseModel):
    """Request payload for hybrid semantic + structured candidate matching."""

    job_offer_id: UUID | None = None
    query_text: str | None = None
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    role: str | None = None
    location: str | None = None
    min_experience_years: float | None = Field(default=None, ge=0.0)
    filters: CandidateSearchFilters = Field(default_factory=CandidateSearchFilters)
    limit: int = Field(default=20, ge=1, le=100)
    semantic_weight: float = Field(default=0.55, ge=0.0, le=1.0)
    structured_weight: float = Field(default=0.45, ge=0.0, le=1.0)


class MatchedChunkEvidence(BaseModel):
    chunk_type: str
    chunk_index: int
    similarity: float
    excerpt: str


class ExplainableMatchSignals(BaseModel):
    semantic_similarity: float
    semantic_score: float
    structured_score: float
    hybrid_score: float
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    preferred_matched_skills: list[str] = Field(default_factory=list)
    extra_skills: list[str] = Field(default_factory=list)
    skill_coverage: float = 0.0
    candidate_experience_years: float = 0.0
    required_experience_years: float | None = None
    experience_gap_years: float = 0.0
    role_match: bool | None = None
    location_match: bool | None = None
    matched_chunks: list[MatchedChunkEvidence] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)


class CandidateMatchResult(BaseModel):
    candidate_id: int
    resume_id: int
    fullname: str
    email: str
    current_role: str | None = None
    location: str | None = None
    total_experience_years: float = 0.0
    photo: str | None = None
    is_talent: bool = False
    signals: ExplainableMatchSignals


class HybridMatchResponse(BaseModel):
    query_summary: dict[str, Any] = Field(default_factory=dict)
    total_candidates_evaluated: int = 0
    results: list[CandidateMatchResult] = Field(default_factory=list)


class ReindexEmbeddingResponse(BaseModel):
    entity_type: str
    entity_id: str
    chunks_indexed: int
    model_name: str
