from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.api.routes.admin import require_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.llm_config import (
    LLMAuditLogPage,
    LLMSettingsResponse,
    ProviderConfigRead,
    ProviderConfigUpdate,
    ProviderTestRequest,
    ProviderTestResponse,
    TaskProfileRead,
    TaskProfileUpdate,
)
from app.services.llm_config_service import LLMConfigService

router = APIRouter(prefix="/admin/llm", tags=["Admin LLM"])


@router.get("/settings", response_model=LLMSettingsResponse)
def get_llm_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> LLMSettingsResponse:
    return LLMConfigService.get_settings(db)


@router.put("/providers/{provider}", response_model=ProviderConfigRead)
def update_llm_provider(
    provider: str,
    payload: ProviderConfigUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ProviderConfigRead:
    return LLMConfigService.update_provider(db, provider, payload, admin)


@router.post("/providers/{provider}/test", response_model=ProviderTestResponse)
def test_llm_provider(
    provider: str,
    payload: ProviderTestRequest | None = Body(default=None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ProviderTestResponse:
    return LLMConfigService.test_provider(
        db,
        provider,
        admin,
        model=payload.model if payload else None,
    )


@router.put("/profiles/{task_category}", response_model=TaskProfileRead)
def update_llm_task_profile(
    task_category: str,
    payload: TaskProfileUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> TaskProfileRead:
    return LLMConfigService.update_task_profile(db, task_category, payload, admin)


@router.get("/audit-logs", response_model=LLMAuditLogPage)
def list_llm_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> LLMAuditLogPage:
    return LLMConfigService.list_audit_logs(db, page=page, page_size=page_size)
