from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.llm_crypto import LLMConfigEncryptionError, encrypt_api_key, mask_api_key
from app.models.llm_config import LLMConfigAuditLog, LLMProviderConfig, LLMTaskProfile
from app.models.user import User
from app.schemas.llm_config import (
    ALLOWED_MODELS_BY_PROVIDER,
    LLMAuditLogPage,
    LLMAuditLogRead,
    LLMSettingsResponse,
    ProviderConfigRead,
    ProviderConfigUpdate,
    ProviderTestResponse,
    SUPPORTED_PROVIDERS,
    SUPPORTED_TASK_CATEGORIES,
    TaskProfileRead,
    TaskProfileUpdate,
)
from app.services.llm_router import (
    LLMRouterService,
    PROVIDER_METADATA,
    TASK_METADATA,
    get_env_default_model,
)


class LLMConfigService:
    """Admin governance service for layered LLM configuration, health checks, and audit logs."""

    @classmethod
    def get_settings(cls, db: Session) -> LLMSettingsResponse:
        providers = [cls._build_provider_read(db, p) for p in SUPPORTED_PROVIDERS]
        profiles = [cls._build_profile_read(db, tc) for tc in SUPPORTED_TASK_CATEGORIES]
        return LLMSettingsResponse(providers=providers, profiles=profiles)

    @classmethod
    def update_provider(
        cls,
        db: Session,
        provider: str,
        payload: ProviderConfigUpdate,
        admin_user: User,
    ) -> ProviderConfigRead:
        if provider not in SUPPORTED_PROVIDERS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown LLM provider '{provider}'.",
            )

        row = (
            db.query(LLMProviderConfig)
            .filter(LLMProviderConfig.provider == provider)
            .first()
        )
        created = row is None
        if row is None:
            row = LLMProviderConfig(
                provider=provider,
                enabled=True,
                health_status="unknown",
            )
            db.add(row)

        diff: dict[str, Any] = {}
        credentials_changed = False

        if payload.enabled is not None and payload.enabled != row.enabled:
            diff["enabled"] = {"from": bool(row.enabled), "to": bool(payload.enabled)}
            row.enabled = payload.enabled

        if payload.clear_base_url:
            if row.custom_base_url is not None:
                diff["custom_base_url"] = {"from": row.custom_base_url, "to": None}
                row.custom_base_url = None
                credentials_changed = True
        elif payload.custom_base_url is not None and payload.custom_base_url != row.custom_base_url:
            diff["custom_base_url"] = {"from": row.custom_base_url, "to": payload.custom_base_url}
            row.custom_base_url = payload.custom_base_url
            credentials_changed = True

        if payload.clear_api_key:
            if row.encrypted_api_key is not None:
                diff["api_key"] = {"action": "cleared", "previous_masked": row.key_hint}
                row.encrypted_api_key = None
                row.key_hint = None
                credentials_changed = True
        elif payload.api_key is not None:
            try:
                encrypted = encrypt_api_key(payload.api_key)
            except LLMConfigEncryptionError as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=str(exc),
                ) from exc
            masked = mask_api_key(payload.api_key)
            row.encrypted_api_key = encrypted
            row.key_hint = masked
            diff["api_key"] = {"action": "updated", "masked": masked}
            credentials_changed = True

        if credentials_changed:
            row.health_status = "unknown"
            row.health_message = "Configuration updated; live health check required."
            row.last_latency_ms = None
            row.last_tested_at = None

        row.updated_by = admin_user.id

        if diff or created:
            if created and not diff:
                diff["initialized"] = True
            db.add(
                LLMConfigAuditLog(
                    admin_user_id=admin_user.id,
                    action="provider.updated",
                    target_type="provider",
                    target_id=provider,
                    diff_summary=diff,
                )
            )

        db.commit()
        db.refresh(row)
        return cls._build_provider_read(db, provider, row=row)

    @classmethod
    def test_provider(
        cls,
        db: Session,
        provider: str,
        admin_user: User,
        model: str | None = None,
    ) -> ProviderTestResponse:
        if provider not in SUPPORTED_PROVIDERS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown LLM provider '{provider}'.",
            )
        try:
            return LLMRouterService.test_provider_connection(
                provider=provider,
                db=db,
                model=model,
                admin_user_id=admin_user.id,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

    @classmethod
    def update_task_profile(
        cls,
        db: Session,
        task_category: str,
        payload: TaskProfileUpdate,
        admin_user: User,
    ) -> TaskProfileRead:
        if task_category not in SUPPORTED_TASK_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown LLM task category '{task_category}'.",
            )

        if payload.is_active:
            cls._ensure_provider_healthy_for_activation(db, payload.active_provider, task_category)
            if payload.fallback_provider:
                cls._ensure_provider_healthy_for_activation(
                    db, payload.fallback_provider, task_category, is_fallback=True
                )

        row = (
            db.query(LLMTaskProfile)
            .filter(LLMTaskProfile.task_category == task_category)
            .first()
        )
        created = row is None
        if row is None:
            row = LLMTaskProfile(
                task_category=task_category,
                active_provider=payload.active_provider,
                primary_model=payload.primary_model,
                fallback_provider=payload.fallback_provider,
                fallback_model=payload.fallback_model,
                temperature=payload.temperature,
                max_tokens=payload.max_tokens,
                timeout_seconds=payload.timeout_seconds,
                is_active=payload.is_active,
                updated_by=admin_user.id,
            )
            db.add(row)
            diff: dict[str, Any] = {
                "created": True,
                "active_provider": payload.active_provider,
                "primary_model": payload.primary_model,
                "fallback_provider": payload.fallback_provider,
                "fallback_model": payload.fallback_model,
                "temperature": payload.temperature,
                "max_tokens": payload.max_tokens,
                "timeout_seconds": payload.timeout_seconds,
                "is_active": payload.is_active,
            }
        else:
            diff = {}
            fields = (
                "active_provider",
                "primary_model",
                "fallback_provider",
                "fallback_model",
                "temperature",
                "max_tokens",
                "timeout_seconds",
                "is_active",
            )
            for field in fields:
                old_val = getattr(row, field)
                new_val = getattr(payload, field)
                if old_val != new_val:
                    diff[field] = {"from": old_val, "to": new_val}
                    setattr(row, field, new_val)
            row.updated_by = admin_user.id

        if diff or created:
            db.add(
                LLMConfigAuditLog(
                    admin_user_id=admin_user.id,
                    action="profile.updated",
                    target_type="task_profile",
                    target_id=task_category,
                    diff_summary=diff,
                )
            )

        db.commit()
        db.refresh(row)
        return cls._build_profile_read(db, task_category, row=row)

    @classmethod
    def list_audit_logs(
        cls,
        db: Session,
        page: int = 1,
        page_size: int = 20,
    ) -> LLMAuditLogPage:
        total = db.query(func.count(LLMConfigAuditLog.id)).scalar() or 0
        offset = (page - 1) * page_size
        rows = (
            db.query(LLMConfigAuditLog, User.email, User.fullname)
            .outerjoin(User, LLMConfigAuditLog.admin_user_id == User.id)
            .order_by(LLMConfigAuditLog.created_at.desc(), LLMConfigAuditLog.id.desc())
            .offset(offset)
            .limit(page_size)
            .all()
        )
        items = [
            LLMAuditLogRead(
                id=log.id,
                admin_user_id=log.admin_user_id,
                admin_email=email,
                admin_fullname=fullname,
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                diff_summary=log.diff_summary or {},
                created_at=log.created_at,
            )
            for log, email, fullname in rows
        ]
        return LLMAuditLogPage(items=items, total=total, page=page, page_size=page_size)

    @staticmethod
    def _ensure_provider_healthy_for_activation(
        db: Session,
        provider: str,
        task_category: str,
        is_fallback: bool = False,
    ) -> None:
        row = (
            db.query(LLMProviderConfig)
            .filter(LLMProviderConfig.provider == provider)
            .first()
        )
        role_label = "Fallback provider" if is_fallback else "Primary provider"
        if row is None or row.health_status != "healthy":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"{role_label} '{provider}' must pass a live health check "
                    f"before activating task profile '{task_category}'."
                ),
            )
        if not row.enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"{role_label} '{provider}' is disabled and cannot be activated "
                    f"for task profile '{task_category}'."
                ),
            )

    @staticmethod
    def _build_provider_read(
        db: Session,
        provider: str,
        row: LLMProviderConfig | None = None,
    ) -> ProviderConfigRead:
        if row is None:
            row = (
                db.query(LLMProviderConfig)
                .filter(LLMProviderConfig.provider == provider)
                .first()
            )
        creds = LLMRouterService.resolve_provider_credentials(provider, db=db)
        meta = PROVIDER_METADATA[provider]
        return ProviderConfigRead(
            provider=provider,  # type: ignore[arg-type]
            display_name=meta["display_name"],
            requires_api_key=creds.requires_api_key,
            enabled=creds.enabled,
            has_custom_key=creds.has_custom_key,
            masked_key=creds.masked_key,
            has_env_key=creds.has_env_key,
            credential_source=creds.credential_source,  # type: ignore[arg-type]
            custom_base_url=row.custom_base_url if row else None,
            effective_base_url=creds.base_url,
            default_model=get_env_default_model(provider),
            allowed_models=ALLOWED_MODELS_BY_PROVIDER[provider],
            health_status=(row.health_status if row else "unknown"),  # type: ignore[arg-type]
            health_message=row.health_message if row else None,
            last_latency_ms=row.last_latency_ms if row else None,
            last_tested_at=row.last_tested_at if row else None,
            updated_at=row.updated_at if row else None,
        )

    @staticmethod
    def _build_profile_read(
        db: Session,
        task_category: str,
        row: LLMTaskProfile | None = None,
    ) -> TaskProfileRead:
        if row is None:
            row = (
                db.query(LLMTaskProfile)
                .filter(LLMTaskProfile.task_category == task_category)
                .first()
            )
        meta = TASK_METADATA[task_category]
        if row is not None:
            return TaskProfileRead(
                task_category=task_category,  # type: ignore[arg-type]
                display_name=meta["display_name"],
                description=meta["description"],
                active_provider=row.active_provider,  # type: ignore[arg-type]
                primary_model=row.primary_model,
                fallback_provider=row.fallback_provider,  # type: ignore[arg-type]
                fallback_model=row.fallback_model,
                temperature=row.temperature,
                max_tokens=row.max_tokens,
                timeout_seconds=row.timeout_seconds,
                is_active=row.is_active,
                source="database",
                updated_at=row.updated_at,
            )

        env_profile = LLMRouterService.resolve_env_default_profile(task_category)
        return TaskProfileRead(
            task_category=task_category,  # type: ignore[arg-type]
            display_name=meta["display_name"],
            description=meta["description"],
            active_provider=env_profile.primary_provider,  # type: ignore[arg-type]
            primary_model=env_profile.primary_model,
            fallback_provider=env_profile.fallback_provider,  # type: ignore[arg-type]
            fallback_model=env_profile.fallback_model,
            temperature=env_profile.temperature,
            max_tokens=env_profile.max_tokens,
            timeout_seconds=env_profile.timeout_seconds,
            is_active=False,
            source="environment_default",
            updated_at=None,
        )
