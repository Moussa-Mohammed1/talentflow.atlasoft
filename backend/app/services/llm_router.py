from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Callable, TypeVar

import httpx
from openai import OpenAI
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.llm_crypto import LLMConfigEncryptionError, decrypt_api_key, mask_api_key, redact_secrets
from app.models.llm_config import LLMConfigAuditLog, LLMProviderConfig, LLMTaskProfile
from app.schemas.llm_config import (
    ALLOWED_MODELS_BY_PROVIDER,
    MAX_MAX_TOKENS,
    MAX_TEMPERATURE,
    MAX_TIMEOUT_SECONDS,
    MIN_MAX_TOKENS,
    MIN_TEMPERATURE,
    MIN_TIMEOUT_SECONDS,
    ProviderTestResponse,
    SUPPORTED_PROVIDERS,
    SUPPORTED_TASK_CATEGORIES,
    validate_model_for_provider,
)
from app.services.llm_observability import record_llm_call_observability

logger = logging.getLogger("talentflow.llm.router")

TModel = TypeVar("TModel", bound=BaseModel)


class LLMRouterError(RuntimeError):
    """Raised when all configured LLM providers fail or cannot satisfy the request."""


@dataclass(frozen=True)
class ResolvedCredentials:
    provider: str
    enabled: bool
    api_key: str
    base_url: str
    credential_source: str  # "custom" | "environment" | "none"
    masked_key: str | None
    has_custom_key: bool
    has_env_key: bool
    requires_api_key: bool
    health_status: str


@dataclass(frozen=True)
class ResolvedProfile:
    task_category: str
    primary_provider: str
    primary_model: str
    fallback_provider: str | None
    fallback_model: str | None
    temperature: float
    max_tokens: int
    timeout_seconds: int
    is_active: bool
    source: str  # "database" | "environment_default"


@dataclass(frozen=True)
class LLMCallResult:
    content: str
    parsed: Any | None
    validated: BaseModel | None
    provider: str
    model: str
    latency_ms: int
    tokens_prompt: int
    tokens_completion: int
    fallback_used: bool
    fallback_reason: str | None = None


PROVIDER_METADATA: dict[str, dict[str, Any]] = {
    "gemini": {
        "display_name": "Google Gemini",
        "requires_api_key": True,
    },
    "deepseek": {
        "display_name": "DeepSeek",
        "requires_api_key": True,
    },
    "ollama": {
        "display_name": "Ollama (Local / Self-Hosted)",
        "requires_api_key": False,
    },
}

TASK_METADATA: dict[str, dict[str, str]] = {
    "cv_extraction": {
        "display_name": "CV Extraction",
        "description": "Structured extraction and verification of skills, identity, experience, education, certifications, and languages.",
    },
    "candidate_evaluation": {
        "display_name": "Candidate Evaluation",
        "description": "Department compatibility scoring and reasoning across candidate profiles.",
    },
    "job_offer_drafting": {
        "display_name": "Job Offer Drafting",
        "description": "Structured job offer generation from raw job descriptions.",
    },
    "general_rag": {
        "display_name": "General / RAG",
        "description": "Recruitment email drafting, summaries, and general retrieval-augmented tasks.",
    },
}


def normalize_provider_alias(raw: str | None) -> str | None:
    cleaned = (raw or "").strip().casefold()
    if not cleaned:
        return None
    if cleaned in {"gemini", "gemini_flash", "google"}:
        return "gemini"
    if cleaned in {"deepseek"}:
        return "deepseek"
    if cleaned in {"ollama", "qwen", "qwen3", "local", "local_qwen"}:
        return "ollama"
    return None


def _clamp_temperature(value: float) -> float:
    return max(MIN_TEMPERATURE, min(MAX_TEMPERATURE, float(value)))


def _clamp_max_tokens(value: int) -> int:
    return max(MIN_MAX_TOKENS, min(MAX_MAX_TOKENS, int(value)))


def _clamp_timeout(value: int) -> int:
    return max(MIN_TIMEOUT_SECONDS, min(MAX_TIMEOUT_SECONDS, int(value)))


def get_env_api_key(provider: str) -> str:
    if provider == "gemini":
        return (os.getenv("GEMINI_API_KEY") or settings.gemini_api_key or "").strip()
    if provider == "deepseek":
        return (
            os.getenv("DEEPSEEK_API_KEY")
            or settings.deepseek_api_key
            or os.getenv("LLM_API_KEY")
            or settings.llm_api_key
            or ""
        ).strip()
    if provider == "ollama":
        return (os.getenv("OLLAMA_API_KEY") or settings.ollama_api_key or "").strip()
    return ""


def get_env_base_url(provider: str) -> str:
    if provider == "gemini":
        return (
            os.getenv("GEMINI_BASE_URL")
            or settings.gemini_base_url
            or "https://generativelanguage.googleapis.com"
        ).strip().rstrip("/")
    if provider == "deepseek":
        return (
            os.getenv("DEEPSEEK_BASE_URL")
            or settings.deepseek_base_url
            or "https://api.deepseek.com/v1"
        ).strip().rstrip("/")
    if provider == "ollama":
        return (
            os.getenv("OLLAMA_BASE_URL")
            or settings.ollama_base_url
            or "http://localhost:11434"
        ).strip().rstrip("/")
    return ""


def get_env_default_model(provider: str) -> str:
    if provider == "gemini":
        candidate = (os.getenv("GEMINI_DEFAULT_MODEL") or settings.gemini_default_model or "gemini-2.5-flash").strip()
    elif provider == "deepseek":
        candidate = (
            os.getenv("DEEPSEEK_DEFAULT_MODEL")
            or settings.deepseek_default_model
            or os.getenv("LLM_MODEL")
            or settings.llm_model
            or "deepseek-chat"
        ).strip()
    elif provider == "ollama":
        candidate = (os.getenv("OLLAMA_DEFAULT_MODEL") or settings.ollama_default_model or "qwen3:8b").strip()
    else:
        return "deepseek-chat"

    try:
        return validate_model_for_provider(provider, candidate)
    except ValueError:
        return ALLOWED_MODELS_BY_PROVIDER[provider][0]


def parse_json_payload(raw_response: str) -> Any:
    """Parse raw LLM output into JSON, tolerating think tags and markdown fences."""
    cleaned = (raw_response or "").strip()
    if "</think>" in cleaned:
        cleaned = cleaned.split("</think>", 1)[1].strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```").strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        obj_start = cleaned.find("{")
        obj_end = cleaned.rfind("}")
        if obj_start >= 0 and obj_end > obj_start:
            try:
                return json.loads(cleaned[obj_start : obj_end + 1])
            except json.JSONDecodeError:
                pass
        arr_start = cleaned.find("[")
        arr_end = cleaned.rfind("]")
        if arr_start >= 0 and arr_end > arr_start:
            return json.loads(cleaned[arr_start : arr_end + 1])
        raise


class LLMRouterService:
    """Centralized provider resolution, invocation, fallback, and health-check router."""

    @classmethod
    def resolve_provider_credentials(
        cls,
        provider: str,
        db: Session | None = None,
    ) -> ResolvedCredentials:
        if provider not in SUPPORTED_PROVIDERS:
            raise ValueError(f"Unsupported provider '{provider}'.")

        meta = PROVIDER_METADATA[provider]
        requires_key = bool(meta["requires_api_key"])
        env_key = get_env_api_key(provider)
        env_url = get_env_base_url(provider)

        row: LLMProviderConfig | None = None
        if db is not None:
            try:
                row = (
                    db.query(LLMProviderConfig)
                    .filter(LLMProviderConfig.provider == provider)
                    .first()
                )
            except Exception as exc:
                logger.warning("Unable to query llm_provider_configs for %s: %s", provider, type(exc).__name__)
                row = None

        enabled = bool(row.enabled) if row is not None else True
        base_url = (row.custom_base_url or "").strip().rstrip("/") if (row and row.custom_base_url) else env_url
        has_custom_key = bool(row and row.encrypted_api_key)
        has_env_key = bool(env_key)

        resolved_key = ""
        credential_source = "none"
        masked = None

        if row is not None and row.encrypted_api_key:
            try:
                resolved_key = decrypt_api_key(row.encrypted_api_key)
                credential_source = "custom"
                masked = row.key_hint or mask_api_key(resolved_key)
            except LLMConfigEncryptionError as exc:
                logger.error("Failed to decrypt custom key for %s: %s", provider, exc)
                if env_key:
                    resolved_key = env_key
                    credential_source = "environment"
                    masked = mask_api_key(env_key)
        elif env_key:
            resolved_key = env_key
            credential_source = "environment"
            masked = mask_api_key(env_key)
        elif not requires_key and base_url:
            credential_source = "environment"

        return ResolvedCredentials(
            provider=provider,
            enabled=enabled,
            api_key=resolved_key,
            base_url=base_url,
            credential_source=credential_source,
            masked_key=masked,
            has_custom_key=has_custom_key,
            has_env_key=has_env_key,
            requires_api_key=requires_key,
            health_status=row.health_status if row is not None else "unknown",
        )

    @classmethod
    def resolve_env_default_profile(cls, task_category: str) -> ResolvedProfile:
        if task_category not in SUPPORTED_TASK_CATEGORIES:
            raise ValueError(f"Unsupported task category '{task_category}'.")

        env_provider = (
            normalize_provider_alias(os.getenv("LLM_DEFAULT_PROVIDER"))
            or normalize_provider_alias(settings.llm_default_provider)
            or "deepseek"
        )
        # Prefer a provider that actually has credentials in env if the default doesn't.
        if PROVIDER_METADATA[env_provider]["requires_api_key"] and not get_env_api_key(env_provider):
            for candidate in ("deepseek", "gemini", "ollama"):
                if not PROVIDER_METADATA[candidate]["requires_api_key"] or get_env_api_key(candidate):
                    env_provider = candidate
                    break

        primary_model = get_env_default_model(env_provider)

        fallback_provider = (
            normalize_provider_alias(os.getenv("LLM_FALLBACK_PROVIDER"))
            or normalize_provider_alias(settings.llm_fallback_provider)
        )
        if fallback_provider == env_provider:
            fallback_provider = "ollama" if env_provider != "ollama" else None
        fallback_model = get_env_default_model(fallback_provider) if fallback_provider else None

        temperature = _clamp_temperature(
            float(os.getenv("LLM_DEFAULT_TEMPERATURE", str(settings.llm_default_temperature)))
        )
        max_tokens = _clamp_max_tokens(
            int(os.getenv("LLM_DEFAULT_MAX_TOKENS", str(settings.llm_default_max_tokens)))
        )
        timeout_seconds = _clamp_timeout(
            int(os.getenv("LLM_DEFAULT_TIMEOUT_SECONDS", str(settings.llm_default_timeout_seconds)))
        )

        return ResolvedProfile(
            task_category=task_category,
            primary_provider=env_provider,
            primary_model=primary_model,
            fallback_provider=fallback_provider,
            fallback_model=fallback_model,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout_seconds=timeout_seconds,
            is_active=True,
            source="environment_default",
        )

    @classmethod
    def resolve_task_profile(
        cls,
        task_category: str,
        db: Session | None = None,
    ) -> ResolvedProfile:
        env_default = cls.resolve_env_default_profile(task_category)
        if db is None:
            return env_default

        try:
            row = (
                db.query(LLMTaskProfile)
                .filter(LLMTaskProfile.task_category == task_category)
                .first()
            )
        except Exception as exc:
            logger.warning("Unable to query llm_task_profiles for %s: %s", task_category, type(exc).__name__)
            return env_default

        if row is None or not row.is_active:
            return env_default

        try:
            primary_model = validate_model_for_provider(row.active_provider, row.primary_model)
        except ValueError:
            logger.warning(
                "Invalid DB primary model for task %s; falling back to environment defaults.",
                task_category,
            )
            return env_default

        fallback_provider = row.fallback_provider if row.fallback_provider in SUPPORTED_PROVIDERS else None
        fallback_model = None
        if fallback_provider and row.fallback_model:
            try:
                fallback_model = validate_model_for_provider(fallback_provider, row.fallback_model)
            except ValueError:
                fallback_provider = None
                fallback_model = None

        return ResolvedProfile(
            task_category=task_category,
            primary_provider=row.active_provider,
            primary_model=primary_model,
            fallback_provider=fallback_provider,
            fallback_model=fallback_model,
            temperature=_clamp_temperature(row.temperature),
            max_tokens=_clamp_max_tokens(row.max_tokens),
            timeout_seconds=_clamp_timeout(row.timeout_seconds),
            is_active=bool(row.is_active),
            source="database",
        )

    @classmethod
    def is_task_configured(
        cls,
        task_category: str,
        db: Session | None = None,
    ) -> bool:
        """Return True when at least one usable provider is configured for this task."""
        profile = cls.resolve_task_profile(task_category, db=db)
        for provider in (profile.primary_provider, profile.fallback_provider):
            if not provider:
                continue
            creds = cls.resolve_provider_credentials(provider, db=db)
            if creds.enabled and (not creds.requires_api_key or bool(creds.api_key)):
                return True
        return False

    @classmethod
    def generate(
        cls,
        *,
        task_category: str,
        prompt: str,
        action: str,
        db: Session | None = None,
        recruiter_id: int | None = None,
        system_prompt: str | None = None,
        response_model: type[TModel] | None = None,
        json_mode: bool = False,
        temperature_override: float | None = None,
        max_tokens_override: int | None = None,
        top_p: float = 0.8,
        validator: Callable[[str], Any] | None = None,
    ) -> LLMCallResult:
        """Execute an LLM call using the resolved task profile with automatic fallback."""
        profile = cls.resolve_task_profile(task_category, db=db)
        env_default = cls.resolve_env_default_profile(task_category)

        temperature = (
            _clamp_temperature(temperature_override)
            if temperature_override is not None
            else profile.temperature
        )
        max_tokens = (
            _clamp_max_tokens(max_tokens_override)
            if max_tokens_override is not None
            else profile.max_tokens
        )
        timeout_seconds = profile.timeout_seconds

        # Build deduplicated candidate execution chain: primary -> profile fallback -> env default
        candidates: list[tuple[str, str]] = [(profile.primary_provider, profile.primary_model)]
        if profile.fallback_provider and profile.fallback_model:
            pair = (profile.fallback_provider, profile.fallback_model)
            if pair not in candidates:
                candidates.append(pair)
        if profile.source == "database":
            env_pair = (env_default.primary_provider, env_default.primary_model)
            if env_pair not in candidates:
                candidates.append(env_pair)
            if env_default.fallback_provider and env_default.fallback_model:
                env_fb = (env_default.fallback_provider, env_default.fallback_model)
                if env_fb not in candidates:
                    candidates.append(env_fb)

        errors: list[str] = []
        primary_label = f"{profile.primary_provider}:{profile.primary_model}"

        for idx, (provider, model) in enumerate(candidates):
            creds = cls.resolve_provider_credentials(provider, db=db)
            if not creds.enabled:
                reason = f"{provider} is disabled"
                errors.append(reason)
                logger.warning("Skipping disabled provider %s for task=%s", provider, task_category)
                continue

            if creds.requires_api_key and not creds.api_key:
                reason = f"{provider} API key not configured"
                errors.append(reason)
                logger.warning("Skipping unconfigured provider %s for task=%s", provider, task_category)
                continue

            started = time.perf_counter()
            try:
                content, tokens_prompt, tokens_completion = cls._invoke_provider(
                    provider=provider,
                    model=model,
                    api_key=creds.api_key,
                    base_url=creds.base_url,
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout_seconds=timeout_seconds,
                    top_p=top_p,
                    json_mode=json_mode or (response_model is not None),
                )
                latency_ms = max(1, int((time.perf_counter() - started) * 1000))

                parsed: Any | None = None
                validated_model: BaseModel | None = None
                if validator is not None:
                    parsed = validator(content)
                elif response_model is not None:
                    parsed = parse_json_payload(content)
                    validated_model = response_model.model_validate(parsed)
                elif json_mode:
                    parsed = parse_json_payload(content)

                fallback_used = idx > 0
                fallback_reason = "; ".join(errors) if fallback_used and errors else None
                record_llm_call_observability(
                    db=db,
                    recruiter_id=recruiter_id,
                    action=action,
                    task_category=task_category,
                    provider=provider,
                    model=model,
                    latency_ms=latency_ms,
                    tokens_prompt=tokens_prompt,
                    tokens_completion=tokens_completion,
                    fallback_used=fallback_used,
                    fallback_from=primary_label if fallback_used else None,
                )

                return LLMCallResult(
                    content=content,
                    parsed=parsed,
                    validated=validated_model,
                    provider=provider,
                    model=model,
                    latency_ms=latency_ms,
                    tokens_prompt=tokens_prompt,
                    tokens_completion=tokens_completion,
                    fallback_used=fallback_used,
                    fallback_reason=fallback_reason,
                )
            except (ValidationError, json.JSONDecodeError, ValueError, TimeoutError, Exception) as exc:
                latency_ms = max(1, int((time.perf_counter() - started) * 1000))
                safe_msg = redact_secrets(
                    f"{type(exc).__name__}: {exc}",
                    [creds.api_key],
                )
                errors.append(f"{provider}:{model} -> {safe_msg}")
                logger.warning(
                    "LLM invocation failed on %s:%s for task=%s (attempt %d/%d): %s",
                    provider,
                    model,
                    task_category,
                    idx + 1,
                    len(candidates),
                    safe_msg,
                )
                record_llm_call_observability(
                    db=db,
                    recruiter_id=recruiter_id,
                    action=action,
                    task_category=task_category,
                    provider=provider,
                    model=model,
                    latency_ms=latency_ms,
                    fallback_used=idx > 0,
                    fallback_from=primary_label if idx > 0 else None,
                    error=safe_msg[:300],
                )

        raise LLMRouterError(
            f"All LLM providers failed for task '{task_category}': {' | '.join(errors)}"
        )

    @classmethod
    def test_provider_connection(
        cls,
        *,
        provider: str,
        db: Session,
        model: str | None = None,
        admin_user_id: int | None = None,
    ) -> ProviderTestResponse:
        """Perform a lightweight live health check against the provider and persist status."""
        if provider not in SUPPORTED_PROVIDERS:
            raise ValueError(f"Unsupported provider '{provider}'.")

        creds = cls.resolve_provider_credentials(provider, db=db)
        target_model = (
            validate_model_for_provider(provider, model)
            if model and model.strip()
            else get_env_default_model(provider)
        )

        started = time.perf_counter()
        healthy = False
        message = ""

        if creds.requires_api_key and not creds.api_key:
            latency_ms = 0
            message = f"No API key configured for {provider} (neither custom nor environment)."
        else:
            try:
                content, _, _ = cls._invoke_provider(
                    provider=provider,
                    model=target_model,
                    api_key=creds.api_key,
                    base_url=creds.base_url,
                    prompt="Reply with the single word OK.",
                    system_prompt=None,
                    temperature=0.0,
                    max_tokens=16,
                    timeout_seconds=15,
                    top_p=1.0,
                    json_mode=False,
                )
                latency_ms = max(1, int((time.perf_counter() - started) * 1000))
                if content.strip():
                    healthy = True
                    message = f"Connected to {provider} ({target_model}) in {latency_ms} ms."
                else:
                    message = f"Provider {provider} ({target_model}) returned an empty response."
            except Exception as exc:
                latency_ms = max(1, int((time.perf_counter() - started) * 1000))
                message = redact_secrets(
                    f"Connection check failed ({type(exc).__name__}): {exc}",
                    [creds.api_key],
                )[:500]

        now = datetime.now(UTC)
        status_label = "healthy" if healthy else "unhealthy"

        row = (
            db.query(LLMProviderConfig)
            .filter(LLMProviderConfig.provider == provider)
            .first()
        )
        if row is None:
            row = LLMProviderConfig(
                provider=provider,
                enabled=True,
                health_status=status_label,
                health_message=message[:512],
                last_latency_ms=latency_ms,
                last_tested_at=now,
                updated_by=admin_user_id,
            )
            db.add(row)
        else:
            row.health_status = status_label
            row.health_message = message[:512]
            row.last_latency_ms = latency_ms
            row.last_tested_at = now
            if admin_user_id is not None:
                row.updated_by = admin_user_id

        if admin_user_id is not None:
            db.add(
                LLMConfigAuditLog(
                    admin_user_id=admin_user_id,
                    action="provider.tested",
                    target_type="provider",
                    target_id=provider,
                    diff_summary={
                        "model": target_model,
                        "health_status": status_label,
                        "latency_ms": latency_ms,
                    },
                )
            )

        db.commit()
        db.refresh(row)

        return ProviderTestResponse(
            provider=provider,  # type: ignore[arg-type]
            model=target_model,
            healthy=healthy,
            health_status=status_label,  # type: ignore[arg-type]
            latency_ms=latency_ms,
            message=message,
            tested_at=now,
        )

    @classmethod
    def _invoke_provider(
        cls,
        *,
        provider: str,
        model: str,
        api_key: str,
        base_url: str,
        prompt: str,
        system_prompt: str | None,
        temperature: float,
        max_tokens: int,
        timeout_seconds: int,
        top_p: float,
        json_mode: bool,
    ) -> tuple[str, int, int]:
        if provider == "deepseek":
            return cls._call_deepseek(
                model=model,
                api_key=api_key,
                base_url=base_url,
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout_seconds=timeout_seconds,
                top_p=top_p,
            )
        if provider == "gemini":
            return cls._call_gemini(
                model=model,
                api_key=api_key,
                base_url=base_url,
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout_seconds=timeout_seconds,
                top_p=top_p,
                json_mode=json_mode,
            )
        if provider == "ollama":
            return cls._call_ollama(
                model=model,
                api_key=api_key,
                base_url=base_url,
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout_seconds=timeout_seconds,
                top_p=top_p,
            )
        raise ValueError(f"Unsupported provider '{provider}'.")

    @staticmethod
    def _call_deepseek(
        *,
        model: str,
        api_key: str,
        base_url: str,
        prompt: str,
        system_prompt: str | None,
        temperature: float,
        max_tokens: int,
        timeout_seconds: int,
        top_p: float,
    ) -> tuple[str, int, int]:
        client = OpenAI(
            api_key=api_key,
            base_url=base_url or "https://api.deepseek.com/v1",
            timeout=float(timeout_seconds),
        )
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = client.chat.completions.create(
            model=model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
        )
        content = response.choices[0].message.content or ""
        prompt_tokens = int(getattr(response.usage, "prompt_tokens", 0) or 0) if response.usage else 0
        completion_tokens = int(getattr(response.usage, "completion_tokens", 0) or 0) if response.usage else 0
        return content, prompt_tokens, completion_tokens

    @staticmethod
    def _call_gemini(
        *,
        model: str,
        api_key: str,
        base_url: str,
        prompt: str,
        system_prompt: str | None,
        temperature: float,
        max_tokens: int,
        timeout_seconds: int,
        top_p: float,
        json_mode: bool,
    ) -> tuple[str, int, int]:
        from google import genai
        from google.genai import types

        http_kwargs: dict[str, Any] = {"timeout": int(timeout_seconds * 1000)}
        default_gemini = "https://generativelanguage.googleapis.com"
        if base_url and base_url.rstrip("/") != default_gemini:
            http_kwargs["base_url"] = base_url.rstrip("/")

        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(**http_kwargs),
        )
        config_kwargs: dict[str, Any] = {
            "temperature": temperature,
            "top_p": top_p,
            "max_output_tokens": max_tokens,
        }
        if system_prompt:
            config_kwargs["system_instruction"] = system_prompt
        if json_mode:
            config_kwargs["response_mime_type"] = "application/json"

        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(**config_kwargs),
        )
        content = getattr(response, "text", None) or ""
        usage = getattr(response, "usage_metadata", None)
        prompt_tokens = int(getattr(usage, "prompt_token_count", 0) or 0) if usage else 0
        completion_tokens = int(getattr(usage, "candidates_token_count", 0) or 0) if usage else 0
        return content, prompt_tokens, completion_tokens

    @staticmethod
    def _call_ollama(
        *,
        model: str,
        api_key: str,
        base_url: str,
        prompt: str,
        system_prompt: str | None,
        temperature: float,
        max_tokens: int,
        timeout_seconds: int,
        top_p: float,
    ) -> tuple[str, int, int]:
        root = (base_url or "http://localhost:11434").rstrip("/")
        if root.endswith("/api/generate") or root.endswith("/api/chat"):
            endpoint = root
        else:
            endpoint = f"{root}/api/chat"

        headers: dict[str, str] = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        if endpoint.endswith("/api/generate"):
            payload: dict[str, Any] = {
                "model": model,
                "prompt": f"{system_prompt}\n\n{prompt}" if system_prompt else prompt,
                "stream": False,
                "think": False,
                "options": {
                    "temperature": temperature,
                    "top_p": top_p,
                    "num_predict": max_tokens,
                },
            }
        else:
            messages: list[dict[str, str]] = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "think": False,
                "options": {
                    "temperature": temperature,
                    "top_p": top_p,
                    "num_predict": max_tokens,
                },
            }

        with httpx.Client(timeout=float(timeout_seconds)) as client:
            resp = client.post(endpoint, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        if "message" in data and isinstance(data["message"], dict):
            content = str(data["message"].get("content") or "")
        else:
            content = str(data.get("response") or "")
        prompt_tokens = int(data.get("prompt_eval_count") or 0)
        completion_tokens = int(data.get("eval_count") or 0)
        return content, prompt_tokens, completion_tokens
