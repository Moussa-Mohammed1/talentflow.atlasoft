from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NotificationPreferencesSchema(BaseModel):
    email_new_candidate: bool = True
    email_invitation_accepted: bool = True
    email_system_updates: bool = True


class UIPreferencesSchema(BaseModel):
    theme: str = Field(default="system", pattern=r"^(light|dark|system)$")
    language: str = Field(default="fr", pattern=r"^(fr|en)$")
    items_per_page: int = Field(default=20, ge=10, le=100)


class UserSettingsResponse(BaseModel):
    notification_preferences: NotificationPreferencesSchema
    preferences: UIPreferencesSchema
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UpdateUserSettingsRequest(BaseModel):
    notification_preferences: Optional[NotificationPreferencesSchema] = None
    preferences: Optional[UIPreferencesSchema] = None
