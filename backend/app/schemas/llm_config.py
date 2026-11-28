from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

LLMProviderLiteral = Literal["gemini", "deepseek", "ollama"]
LLMTaskCategoryLiteral = Literal[
    "cv_extraction",
    "candidate_evaluation",
    "job_offer_drafting",
    "general_rag",
]
LLMHealthStatusLiteral = Literal["unknown", "healthy", "unhealthy"]
LLMCredentialSourceLiteral = Literal["custom", "environment", "none"]

SUPPORTED_PROVIDERS: tuple[LLMProviderLiteral, ...] = ("gemini", "deepseek", "ollama")
SUPPORTED_TASK_CATEGORIES: tuple[LLMTaskCategoryLiteral, ...] = (
    "cv_extraction",
    "candidate_evaluation",
    "job_offer_drafting",
    "general_rag",
)

ALLOWED_MODELS_BY_PROVIDER: dict[str, list[str]] = {
    "gemini": [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ],
    "deepseek": [
        "deepseek-chat",
        "deepseek-reasoner",
    ],
    "ollama": [
        "qwen3:8b",
        "qwen2.5:7b",
        "qwen2.5:14b",
        "llama3.1:8b",
        "llama3.2:latest",
        "mistral:7b",
        "deepseek-r1:8b",
        "gemma3:12b",
    ],
}

_OLLAMA_MODEL_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}(:[a-zA-Z0-9][a-zA-Z0-9._-]{0,31})?$")

MIN_TEMPERATURE = 0.0
MAX_TEMPERATURE = 1.0
MIN_MAX_TOKENS = 128
MAX_MAX_TOKENS = 16384
MIN_TIMEOUT_SECONDS = 5
MAX_TIMEOUT_SECONDS = 120


def validate_model_for_provider(provider: str, model_name: str) -> str:
    cleaned = (model_name or "").strip()
    if not cleaned:
        raise ValueError("Model identifier cannot be empty.")

    if provider in {"gemini", "deepseek"}:
        allowed = ALLOWED_MODELS_BY_PROVIDER[provider]
        if cleaned not in allowed:
            raise ValueError(
                f"Model '{cleaned}' is not in the allowlist for provider '{provider}': {', '.join(allowed)}"
            )
        return cleaned

    if provider == "ollama":
        if not _OLLAMA_MODEL_RE.match(cleaned):
            raise ValueError(
                f"Invalid Ollama model identifier '{cleaned}'. Expected format like 'qwen3:8b' or 'llama3.1:8b'."
            )
        return cleaned

    raise ValueError(f"Unsupported provider '{provider}'.")


def validate_base_url(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Base URL must be a valid http:// or https:// URL.")
    if parsed.username or parsed.password:
        raise ValueError("Base URL must not embed credentials.")
    return cleaned.rstrip("/")


class ProviderConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider: LLMProviderLiteral
    display_name: str
    requires_api_key: bool = True
    enabled: bool
    has_custom_key: bool
    masked_key: str | None = None
    has_env_key: bool
    credential_source: LLMCredentialSourceLiteral
    custom_base_url: str | None = None
    effective_base_url: str
    default_model: str
    allowed_models: list[str]
    health_status: LLMHealthStatusLiteral = "unknown"
    health_message: str | None = None
    last_latency_ms: int | None = None
    last_tested_at: datetime | None = None
    updated_at: datetime | None = None


class ProviderConfigUpdate(BaseModel):
    enabled: bool | None = None
    custom_base_url: str | None = None
    clear_base_url: bool = False
    api_key: str | None = Field(default=None, max_length=512)
    clear_api_key: bool = False

    @field_validator("custom_base_url")
    @classmethod
    def _validate_url(cls, v: str | None) -> str | None:
        return validate_base_url(v)

    @field_validator("api_key")
    @classmethod
    def _validate_api_key(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("API key cannot be blank; set clear_api_key=true to remove it.")
        if len(cleaned) < 6:
            raise ValueError("API key is too short.")
        return cleaned

    @model_validator(mode="after")
    def _check_conflicting_flags(self) -> "ProviderConfigUpdate":
        if self.api_key is not None and self.clear_api_key:
            raise ValueError("Cannot provide api_key and clear_api_key=true simultaneously.")
        if self.custom_base_url is not None and self.clear_base_url:
            raise ValueError("Cannot provide custom_base_url and clear_base_url=true simultaneously.")
        return self


class ProviderTestRequest(BaseModel):
    model: str | None = Field(default=None, max_length=128)


class ProviderTestResponse(BaseModel):
    provider: LLMProviderLiteral
    model: str
    healthy: bool
    health_status: Literal["healthy", "unhealthy"]
    latency_ms: int
    message: str
    tested_at: datetime


class TaskProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_category: LLMTaskCategoryLiteral
    display_name: str
    description: str
    active_provider: LLMProviderLiteral
    primary_model: str
    fallback_provider: LLMProviderLiteral | None = None
    fallback_model: str | None = None
    temperature: float = Field(ge=MIN_TEMPERATURE, le=MAX_TEMPERATURE)
    max_tokens: int = Field(ge=MIN_MAX_TOKENS, le=MAX_MAX_TOKENS)
    timeout_seconds: int = Field(ge=MIN_TIMEOUT_SECONDS, le=MAX_TIMEOUT_SECONDS)
    is_active: bool
    source: Literal["database", "environment_default"]
    updated_at: datetime | None = None


class TaskProfileUpdate(BaseModel):
    active_provider: LLMProviderLiteral
    primary_model: str = Field(min_length=1, max_length=128)
    fallback_provider: LLMProviderLiteral | None = None
    fallback_model: str | None = Field(default=None, max_length=128)
    temperature: float = Field(default=0.1, ge=MIN_TEMPERATURE, le=MAX_TEMPERATURE)
    max_tokens: int = Field(default=4096, ge=MIN_MAX_TOKENS, le=MAX_MAX_TOKENS)
    timeout_seconds: int = Field(default=60, ge=MIN_TIMEOUT_SECONDS, le=MAX_TIMEOUT_SECONDS)
    is_active: bool = True

    @model_validator(mode="after")
    def _validate_models_and_fallback(self) -> "TaskProfileUpdate":
        self.primary_model = validate_model_for_provider(self.active_provider, self.primary_model)

        if (self.fallback_provider is None) ^ (self.fallback_model is None or not self.fallback_model.strip()):
            raise ValueError("fallback_provider and fallback_model must both be provided or both omitted.")

        if self.fallback_provider is not None and self.fallback_model is not None:
            self.fallback_model = validate_model_for_provider(self.fallback_provider, self.fallback_model)
            if (
                self.fallback_provider == self.active_provider
                and self.fallback_model == self.primary_model
            ):
                raise ValueError("Fallback provider and model must differ from the primary provider and model.")

        return self


class LLMGuardrailsMeta(BaseModel):
    min_temperature: float = MIN_TEMPERATURE
    max_temperature: float = MAX_TEMPERATURE
    min_max_tokens: int = MIN_MAX_TOKENS
    max_max_tokens: int = MAX_MAX_TOKENS
    min_timeout_seconds: int = MIN_TIMEOUT_SECONDS
    max_timeout_seconds: int = MAX_TIMEOUT_SECONDS
    allowed_models_by_provider: dict[str, list[str]] = ALLOWED_MODELS_BY_PROVIDER


class LLMSettingsResponse(BaseModel):
    providers: list[ProviderConfigRead]
    profiles: list[TaskProfileRead]
    guardrails: LLMGuardrailsMeta = Field(default_factory=LLMGuardrailsMeta)


class LLMAuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    admin_user_id: int | None = None
    admin_email: str | None = None
    admin_fullname: str | None = None
    action: str
    target_type: str
    target_id: str
    diff_summary: dict[str, Any]
    created_at: datetime


class LLMAuditLogPage(BaseModel):
    items: list[LLMAuditLogRead]
    total: int
    page: int
    page_size: int
