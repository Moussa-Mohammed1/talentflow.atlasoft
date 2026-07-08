from sqlalchemy.orm import Session

from app.models.llm_usage import LLMUsage


def record_llm_usage(
    db: Session,
    recruiter_id: int,
    action: str,
    model: str,
    tokens_prompt: int = 0,
    tokens_completion: int = 0,
    duration_ms: int | None = None,
) -> None:
    usage = LLMUsage(
        recruiter_id=recruiter_id,
        action=action,
        model=model,
        tokens_prompt=tokens_prompt,
        tokens_completion=tokens_completion,
        duration_ms=duration_ms,
    )
    db.add(usage)
    db.commit()
