from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.llm_usage import LLMUsage
from app.models.user import User
from app.schemas.evaluation_checks import (
    ObservabilityStatusResponse,
    RunEvalRequest,
    RunEvalResponse,
)
from app.services.evaluation_checks.datasets import (
    EXTRACTION_EVAL_DATASET,
    GROUNDING_EVAL_DATASET,
    MATCHING_EVAL_DATASET,
)
from app.services.evaluation_checks.runner import EvaluationChecksRunner
from app.services.llm_observability import get_observability_status

router = APIRouter(prefix="/observability", tags=["Observability & Evaluations"])


@router.get("/status", response_model=ObservabilityStatusResponse)
def get_observability_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ObservabilityStatusResponse:
    status_info = get_observability_status()
    rows = db.query(LLMUsage).all()

    total_calls = len(rows)
    total_prompt = sum(int(r.tokens_prompt or 0) for r in rows)
    total_completion = sum(int(r.tokens_completion or 0) for r in rows)
    durations = [int(r.duration_ms) for r in rows if r.duration_ms is not None]
    avg_latency = round(sum(durations) / len(durations), 2) if durations else 0.0

    provider_breakdown: dict[str, int] = {}
    for row in rows:
        provider = row.model.split(":", 1)[0] if ":" in (row.model or "") else "unknown"
        provider_breakdown[provider] = provider_breakdown.get(provider, 0) + 1

    return ObservabilityStatusResponse(
        langfuse_configured=bool(status_info["langfuse_configured"]),
        langfuse_active=bool(status_info["langfuse_active"]),
        langfuse_host=str(status_info["langfuse_host"]),
        environment=str(status_info["environment"]),
        total_llm_calls=total_calls,
        total_prompt_tokens=total_prompt,
        total_completion_tokens=total_completion,
        avg_latency_ms=avg_latency,
        provider_breakdown=provider_breakdown,
    )


@router.get("/evals/datasets")
def list_evaluation_datasets(
    current_user: User = Depends(get_current_user),
) -> dict:
    return {
        "datasets": [
            {
                "name": "extraction",
                "cases_count": len(EXTRACTION_EVAL_DATASET),
                "case_ids": [c.case_id for c in EXTRACTION_EVAL_DATASET],
            },
            {
                "name": "matching",
                "cases_count": len(MATCHING_EVAL_DATASET),
                "case_ids": [c.case_id for c in MATCHING_EVAL_DATASET],
            },
            {
                "name": "grounding",
                "cases_count": len(GROUNDING_EVAL_DATASET),
                "case_ids": [c.case_id for c in GROUNDING_EVAL_DATASET],
            },
        ]
    }


@router.post("/evals/run", response_model=RunEvalResponse)
def run_evaluation_checks(
    payload: RunEvalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunEvalResponse:
    runner = EvaluationChecksRunner(db)
    return runner.run(payload)
