from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
import logging
import os
import time
from typing import Any, Iterator, Literal
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import correlation_id_ctx
from app.services.llm_usage_recorder import record_llm_usage

logger = logging.getLogger("talentflow.llm.observability")

_langfuse_client: Any = None
_langfuse_initialized = False

_active_trace_id_ctx: ContextVar[str | None] = ContextVar("talentflow_active_trace_id", default=None)
_active_observation_id_ctx: ContextVar[str | None] = ContextVar("talentflow_active_observation_id", default=None)

ObservationKind = Literal[
    "span",
    "chain",
    "retriever",
    "tool",
    "generation",
    "evaluator",
    "guardrail",
    "agent",
    "embedding",
]


@dataclass
class SpanContext:
    """Mutable observation handle yielded by `observe_span` for attaching outputs, usage, and scores."""

    name: str
    as_type: ObservationKind
    trace_id: str
    observation_id: str | None = None
    output: Any = None
    metadata: dict[str, Any] = field(default_factory=dict)
    usage_details: dict[str, int] | None = None
    model: str | None = None
    level: Literal["DEBUG", "DEFAULT", "WARNING", "ERROR"] = "DEFAULT"
    status_message: str | None = None
    duration_ms: int = 0
    _lf_span: Any = None

    def set_output(self, output: Any) -> None:
        self.output = output
        if self._lf_span is not None:
            try:
                self._lf_span.update(output=output)
            except Exception:
                pass

    def set_error(self, error: str) -> None:
        self.level = "ERROR"
        self.status_message = error
        if self._lf_span is not None:
            try:
                self._lf_span.update(level="ERROR", status_message=error)
            except Exception:
                pass

    def update(self, **kwargs: Any) -> None:
        if "output" in kwargs:
            self.output = kwargs["output"]
        if "metadata" in kwargs and isinstance(kwargs["metadata"], dict):
            self.metadata.update(kwargs["metadata"])
        if "usage_details" in kwargs:
            self.usage_details = kwargs["usage_details"]
        if "model" in kwargs:
            self.model = kwargs["model"]
        if "level" in kwargs:
            self.level = kwargs["level"]
        if "status_message" in kwargs:
            self.status_message = kwargs["status_message"]
        if self._lf_span is not None:
            try:
                self._lf_span.update(**kwargs)
            except Exception:
                pass


def reset_langfuse_client() -> None:
    """Reset the cached Langfuse client (useful in tests or config reloads)."""
    global _langfuse_client, _langfuse_initialized
    _langfuse_client = None
    _langfuse_initialized = False


def get_active_trace_id() -> str | None:
    return _active_trace_id_ctx.get()


def is_langfuse_configured() -> bool:
    public_key = (os.getenv("LANGFUSE_PUBLIC_KEY") or settings.langfuse_public_key or "").strip()
    secret_key = (os.getenv("LANGFUSE_SECRET_KEY") or settings.langfuse_secret_key or "").strip()
    return bool(public_key and secret_key)


def _get_langfuse_client() -> Any | None:
    global _langfuse_client, _langfuse_initialized
    if _langfuse_initialized:
        return _langfuse_client
    _langfuse_initialized = True

    public_key = (os.getenv("LANGFUSE_PUBLIC_KEY") or settings.langfuse_public_key or "").strip()
    secret_key = (os.getenv("LANGFUSE_SECRET_KEY") or settings.langfuse_secret_key or "").strip()
    host = (os.getenv("LANGFUSE_HOST") or settings.langfuse_host or "https://cloud.langfuse.com").strip()

    if not public_key or not secret_key:
        return None

    try:
        from langfuse import Langfuse  # type: ignore[import-not-found]

        _langfuse_client = Langfuse(
            public_key=public_key,
            secret_key=secret_key,
            host=host,
            environment=settings.environment,
        )
    except Exception as exc:
        logger.debug("Langfuse client unavailable: %s", type(exc).__name__)
        _langfuse_client = None
    return _langfuse_client


@contextmanager
def observe_span(
    name: str,
    *,
    as_type: ObservationKind = "span",
    user_id: int | str | None = None,
    session_id: str | None = None,
    input_data: Any = None,
    metadata: dict[str, Any] | None = None,
    tags: list[str] | None = None,
    model: str | None = None,
) -> Iterator[SpanContext]:
    """Open a Langfuse v5 OTel observation span with graceful offline fallback."""
    cid = correlation_id_ctx.get()
    merged_meta: dict[str, Any] = dict(metadata or {})
    if cid:
        merged_meta.setdefault("correlation_id", cid)

    parent_trace_id = _active_trace_id_ctx.get()
    trace_id = parent_trace_id or uuid4().hex
    started = time.perf_counter()

    lf = _get_langfuse_client()
    span_ctx = SpanContext(
        name=name,
        as_type=as_type,
        trace_id=trace_id,
        metadata=merged_meta,
        model=model,
    )

    trace_token = _active_trace_id_ctx.set(trace_id)
    obs_token = None

    if lf is not None:
        try:
            from langfuse import propagate_attributes  # type: ignore[import-not-found]

            obs_kwargs: dict[str, Any] = {
                "name": name,
                "as_type": as_type,
                "input": input_data,
                "metadata": merged_meta or None,
            }
            if model is not None:
                obs_kwargs["model"] = model

            with propagate_attributes(
                user_id=str(user_id) if user_id is not None else None,
                session_id=session_id,
                tags=tags,
                trace_name=name if parent_trace_id is None else None,
            ):
                with lf.start_as_current_observation(**obs_kwargs) as lf_span:
                    span_ctx._lf_span = lf_span
                    lf_trace_id = getattr(lf_span, "trace_id", None)
                    if lf_trace_id:
                        span_ctx.trace_id = str(lf_trace_id)
                        _active_trace_id_ctx.set(span_ctx.trace_id)
                    lf_obs_id = getattr(lf_span, "id", None)
                    if lf_obs_id:
                        span_ctx.observation_id = str(lf_obs_id)
                        obs_token = _active_observation_id_ctx.set(span_ctx.observation_id)
                    try:
                        yield span_ctx
                    except Exception as exc:
                        span_ctx.set_error(f"{type(exc).__name__}: {exc}")
                        raise
                    finally:
                        span_ctx.duration_ms = max(1, int((time.perf_counter() - started) * 1000))
            return
        except Exception as exc:
            # If the exception came from inside the yielded block, re-raise it cleanly
            if span_ctx.level == "ERROR":
                raise
            logger.debug("Langfuse observation skipped for %s: %s", name, type(exc).__name__)
        finally:
            if obs_token is not None:
                _active_observation_id_ctx.reset(obs_token)
            _active_trace_id_ctx.reset(trace_token)

    try:
        yield span_ctx
    except Exception as exc:
        span_ctx.set_error(f"{type(exc).__name__}: {exc}")
        raise
    finally:
        span_ctx.duration_ms = max(1, int((time.perf_counter() - started) * 1000))
        _active_trace_id_ctx.reset(trace_token)
        logger.debug(
            "span_completed name=%s type=%s trace_id=%s duration_ms=%d level=%s cid=%s",
            name,
            as_type,
            span_ctx.trace_id,
            span_ctx.duration_ms,
            span_ctx.level,
            cid,
        )


def record_langfuse_score(
    *,
    name: str,
    value: float | str | bool,
    trace_id: str | None = None,
    observation_id: str | None = None,
    data_type: Literal["NUMERIC", "CATEGORICAL", "BOOLEAN", "TEXT"] = "NUMERIC",
    comment: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> bool:
    """Attach an evaluation or grounding score to a Langfuse trace when configured."""
    resolved_trace = trace_id or _active_trace_id_ctx.get()
    lf = _get_langfuse_client()
    if lf is None or not resolved_trace:
        return False

    try:
        lf.create_score(
            name=name,
            value=value,
            trace_id=resolved_trace,
            observation_id=observation_id or _active_observation_id_ctx.get(),
            data_type=data_type,
            comment=comment,
            metadata=metadata,
        )
        return True
    except Exception as exc:
        logger.debug("Langfuse score emission skipped (%s): %s", name, type(exc).__name__)
        return False


def sync_langfuse_dataset_item(
    *,
    dataset_name: str,
    item_id: str,
    input_data: Any,
    expected_output: Any,
    metadata: dict[str, Any] | None = None,
) -> bool:
    """Upsert an evaluation dataset item into Langfuse when configured."""
    lf = _get_langfuse_client()
    if lf is None:
        return False
    try:
        try:
            lf.create_dataset(name=dataset_name)
        except Exception:
            pass
        lf.create_dataset_item(
            dataset_name=dataset_name,
            id=item_id,
            input=input_data,
            expected_output=expected_output,
            metadata=metadata,
        )
        return True
    except Exception as exc:
        logger.debug("Langfuse dataset sync skipped (%s): %s", dataset_name, type(exc).__name__)
        return False


def flush_observability() -> None:
    lf = _get_langfuse_client()
    if lf is not None:
        try:
            lf.flush()
        except Exception:
            pass


def get_observability_status() -> dict[str, Any]:
    host = (os.getenv("LANGFUSE_HOST") or settings.langfuse_host or "https://cloud.langfuse.com").strip()
    configured = is_langfuse_configured()
    client = _get_langfuse_client() if configured else None
    return {
        "langfuse_configured": configured,
        "langfuse_active": client is not None,
        "langfuse_host": host,
        "environment": settings.environment,
    }


def record_llm_call_observability(
    *,
    db: Session | None,
    recruiter_id: int | None,
    action: str,
    task_category: str,
    provider: str,
    model: str,
    latency_ms: int,
    tokens_prompt: int = 0,
    tokens_completion: int = 0,
    fallback_used: bool = False,
    fallback_from: str | None = None,
    error: str | None = None,
) -> None:
    """Emit structured LLM telemetry, persist LLMUsage, and record a Langfuse v5 generation."""
    cid = correlation_id_ctx.get()
    if error:
        logger.warning(
            "llm_call_failed action=%s task=%s provider=%s model=%s latency_ms=%d fallback_used=%s cid=%s error=%s",
            action,
            task_category,
            provider,
            model,
            latency_ms,
            fallback_used,
            cid,
            error,
        )
    else:
        logger.info(
            "llm_call_completed action=%s task=%s provider=%s model=%s latency_ms=%d prompt_tokens=%d completion_tokens=%d fallback_used=%s fallback_from=%s cid=%s",
            action,
            task_category,
            provider,
            model,
            latency_ms,
            tokens_prompt,
            tokens_completion,
            fallback_used,
            fallback_from or "-",
            cid,
        )

    if error is None and db is not None and recruiter_id is not None:
        try:
            record_llm_usage(
                db=db,
                recruiter_id=recruiter_id,
                action=action,
                model=model if model.startswith(f"{provider}:") else f"{provider}:{model}",
                tokens_prompt=tokens_prompt,
                tokens_completion=tokens_completion,
                duration_ms=latency_ms,
            )
        except Exception as exc:
            logger.warning("Failed to persist LLMUsage record: %s", type(exc).__name__)

    lf = _get_langfuse_client()
    if lf is not None:
        try:
            from langfuse import propagate_attributes  # type: ignore[import-not-found]

            meta = {
                "task_category": task_category,
                "action": action,
                "provider": provider,
                "latency_ms": latency_ms,
                "fallback_used": fallback_used,
                "fallback_from": fallback_from,
                "correlation_id": cid,
                "error": error,
            }
            with propagate_attributes(
                user_id=str(recruiter_id) if recruiter_id is not None else None,
                tags=["talentflow", task_category, provider],
            ):
                with lf.start_as_current_observation(
                    name=f"talentflow.{task_category}.{action}",
                    as_type="generation",
                    model=model,
                    usage_details={
                        "input": tokens_prompt,
                        "output": tokens_completion,
                        "total": tokens_prompt + tokens_completion,
                    },
                    metadata=meta,
                    level="ERROR" if error else "DEFAULT",
                    status_message=error,
                ) as gen:
                    if error:
                        gen.update(level="ERROR", status_message=error)
        except Exception as exc:
            logger.debug("Langfuse trace emission skipped: %s", type(exc).__name__)
