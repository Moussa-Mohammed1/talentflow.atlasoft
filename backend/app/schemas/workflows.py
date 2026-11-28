from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.evaluate import DepartmentEvaluation
from app.schemas.job_offers import JobOfferRead
from app.schemas.matching import ExplainableMatchSignals
from app.schemas.rag import GroundedCandidateSummaryResponse, GroundedDraftResponse


class WorkflowStepTrace(BaseModel):
    node: str
    status: Literal["completed", "fallback", "skipped", "failed"]
    duration_ms: int = 0
    details: dict[str, Any] = Field(default_factory=dict)


class CandidateRecruitmentWorkflowRequest(BaseModel):
    candidate_id: int
    job_offer_id: UUID | None = None
    department_id: int | None = None
    draft_language: str = "french"
    company_name: str = "TalentFlow"
    recruiter_name: str = ""
    interview_date: str | None = None
    interview_time: str | None = None
    duration_minutes: int = Field(default=60, ge=15, le=480)
    location: str | None = None
    include_email_draft: bool = True
    min_compatibility_for_interview: float = Field(default=50.0, ge=0.0, le=100.0)


class CandidateRecruitmentWorkflowResponse(BaseModel):
    workflow_name: str = "recruitment_pipeline"
    trace_id: str | None = None
    status: Literal["completed", "completed_with_fallback", "rejected_low_match", "failed"]
    candidate_id: int
    job_offer_id: UUID | None = None
    decision: Literal["proceed_to_interview", "hold_or_reject", "error"]
    overall_score: float = 0.0
    retrieved_evidence_count: int = 0
    department_evaluations: list[DepartmentEvaluation] = Field(default_factory=list)
    match_signals: ExplainableMatchSignals | None = None
    grounded_summary: GroundedCandidateSummaryResponse | None = None
    draft_email: GroundedDraftResponse | None = None
    validation_passed: bool = False
    validation_warnings: list[str] = Field(default_factory=list)
    fallback_used: bool = False
    error_message: str | None = None
    step_history: list[WorkflowStepTrace] = Field(default_factory=list)


class JobOfferIntakeWorkflowRequest(BaseModel):
    raw_description: str = Field(..., min_length=10)
    department_name: str | None = None
    persist: bool = True


class JobOfferIntakeWorkflowResponse(BaseModel):
    workflow_name: str = "job_offer_intake"
    trace_id: str | None = None
    status: Literal["completed", "completed_with_fallback", "failed"]
    parsed_offer: dict[str, Any] = Field(default_factory=dict)
    extracted_skills: list[str] = Field(default_factory=list)
    resolved_department_id: int | None = None
    persisted_offer: JobOfferRead | None = None
    validation_passed: bool = False
    validation_warnings: list[str] = Field(default_factory=list)
    fallback_used: bool = False
    step_history: list[WorkflowStepTrace] = Field(default_factory=list)


class WorkflowGraphDescriptor(BaseModel):
    name: str
    description: str
    nodes: list[str]
    mermaid: str
