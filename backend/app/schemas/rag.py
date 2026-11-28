from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.matching import ExplainableMatchSignals


class GroundedEvidenceItem(BaseModel):
    """Atomic verifiable fact retrieved from structured DB rows or pgvector chunks."""

    source_id: str
    source_type: Literal[
        "candidate_attribute",
        "candidate_chunk",
        "job_offer",
        "department_requirement",
        "match_signal",
    ]
    label: str
    excerpt: str
    similarity: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class GroundedContextBundle(BaseModel):
    """Complete retrieval-grounded context passed to RAG prompts and grounding verifiers."""

    candidate_id: int
    candidate_name: str
    candidate_email: str = ""
    candidate_role: str | None = None
    candidate_location: str | None = None
    candidate_experience_years: float = 0.0
    candidate_skills: list[str] = Field(default_factory=list)
    candidate_languages: list[str] = Field(default_factory=list)
    candidate_educations: list[str] = Field(default_factory=list)
    candidate_certifications: list[str] = Field(default_factory=list)
    job_offer_id: UUID | None = None
    job_title: str | None = None
    job_location: str | None = None
    job_required_skills: list[str] = Field(default_factory=list)
    job_required_experience_years: float | None = None
    match_signals: ExplainableMatchSignals | None = None
    evidence: list[GroundedEvidenceItem] = Field(default_factory=list)
    trace_id: str | None = None

    @property
    def evidence_ids(self) -> list[str]:
        return [item.source_id for item in self.evidence]

    def render_prompt_context(self) -> str:
        lines = [
            "=== RETRIEVED GROUNDING EVIDENCE (Cite ONLY these [source_id] tags) ===",
        ]
        for item in self.evidence:
            sim_str = f" (similarity={item.similarity:.3f})" if item.similarity is not None else ""
            lines.append(f"[{item.source_id}] ({item.source_type} | {item.label}{sim_str}): {item.excerpt}")
        return "\n".join(lines)


class GroundedClaimCitation(BaseModel):
    claim: str
    evidence_ids: list[str] = Field(default_factory=list)
    supported: bool = True
    note: str | None = None


class GroundingCheckResult(BaseModel):
    grounding_score: float = Field(ge=0.0, le=1.0)
    passed: bool
    citations: list[GroundedClaimCitation] = Field(default_factory=list)
    invalid_evidence_ids: list[str] = Field(default_factory=list)
    unsupported_claims: list[str] = Field(default_factory=list)


class RetrieveContextRequest(BaseModel):
    candidate_id: int
    job_offer_id: UUID | None = None
    focus_query: str | None = None
    top_k_chunks: int = Field(default=5, ge=1, le=20)


class GroundedSummaryRequest(BaseModel):
    candidate_id: int
    job_offer_id: UUID | None = None
    focus_query: str | None = None
    top_k_chunks: int = Field(default=5, ge=1, le=20)


class GroundedCandidateSummaryResponse(BaseModel):
    candidate_id: int
    job_offer_id: UUID | None = None
    summary: str
    strengths: list[str] = Field(default_factory=list)
    risks_or_gaps: list[str] = Field(default_factory=list)
    recommended_next_step: str
    citations: list[GroundedClaimCitation] = Field(default_factory=list)
    grounding_score: float = Field(ge=0.0, le=1.0)
    unsupported_claims: list[str] = Field(default_factory=list)
    evidence_used: list[GroundedEvidenceItem] = Field(default_factory=list)
    provider: str
    model: str
    fallback_used: bool = False
    trace_id: str | None = None


class GroundedDraftRequest(BaseModel):
    recruitment_id: UUID | None = None
    candidate_id: int | None = None
    job_offer_id: UUID | None = None
    draft_type: Literal["interview_invitation", "outreach", "screening_summary"] = "interview_invitation"
    interview_date: str | None = None
    interview_time: str | None = None
    duration_minutes: int = Field(default=60, ge=15, le=480)
    location: str | None = None
    recruiter_name: str = ""
    company_name: str = "TalentFlow"
    language: str = "french"


class GroundedDraftResponse(BaseModel):
    candidate_id: int
    job_offer_id: UUID | None = None
    draft_type: str
    subject: str
    body: str
    citations: list[GroundedClaimCitation] = Field(default_factory=list)
    grounding_score: float = Field(ge=0.0, le=1.0)
    unsupported_claims: list[str] = Field(default_factory=list)
    evidence_used: list[GroundedEvidenceItem] = Field(default_factory=list)
    provider: str
    model: str
    fallback_used: bool = False
    trace_id: str | None = None
