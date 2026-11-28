from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ExtractionEvalCase(BaseModel):
    case_id: str
    description: str
    raw_text: str
    expected_skills: list[str] = Field(default_factory=list)
    expected_languages: list[str] = Field(default_factory=list)
    expected_role: str | None = None
    expected_location: str | None = None
    expected_min_experience_years: float | None = None


class MatchEvalCandidate(BaseModel):
    candidate_id: int
    fullname: str
    skills: list[str] = Field(default_factory=list)
    current_role: str | None = None
    location: str | None = None
    total_experience_years: float = 0.0
    summary: str = ""
    relevant: bool = False
    relevance_grade: int = 0


class MatchEvalCase(BaseModel):
    case_id: str
    description: str
    job_query: str
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    target_role: str | None = None
    target_location: str | None = None
    min_experience_years: float | None = None
    candidates: list[MatchEvalCandidate] = Field(default_factory=list)
    expected_top_candidate_id: int


class GroundingEvalCase(BaseModel):
    case_id: str
    description: str
    candidate_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    candidate_experience_years: float = 0.0
    available_evidence_ids: list[str] = Field(default_factory=list)
    claims: list[dict[str, Any]] = Field(default_factory=list)
    generated_text: str
    expected_grounded: bool


class EvalCaseResult(BaseModel):
    case_id: str
    suite: Literal["extraction", "matching", "grounding"]
    passed: bool
    metrics: dict[str, float] = Field(default_factory=dict)
    details: dict[str, Any] = Field(default_factory=dict)


class EvalSuiteReport(BaseModel):
    suite: Literal["extraction", "matching", "grounding"]
    total_cases: int
    passed_cases: int
    failed_cases: int
    pass_rate: float
    aggregate_metrics: dict[str, float] = Field(default_factory=dict)
    results: list[EvalCaseResult] = Field(default_factory=list)
    trace_id: str | None = None
    langfuse_synced: bool = False


class RunEvalRequest(BaseModel):
    suite: Literal["all", "extraction", "matching", "grounding"] = "all"
    sync_langfuse_datasets: bool = False


class RunEvalResponse(BaseModel):
    reports: list[EvalSuiteReport]
    overall_pass_rate: float
    trace_id: str | None = None


class ObservabilityStatusResponse(BaseModel):
    langfuse_configured: bool
    langfuse_active: bool
    langfuse_host: str
    environment: str
    total_llm_calls: int = 0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    avg_latency_ms: float = 0.0
    provider_breakdown: dict[str, int] = Field(default_factory=dict)
