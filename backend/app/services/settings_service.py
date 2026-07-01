from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_preference import UserPreference
from app.schemas.settings import (
    NotificationPreferencesSchema,
    UIPreferencesSchema,
    UpdateUserSettingsRequest,
    UserSettingsResponse,
)


class SettingsService:

    @staticmethod
    def get_or_create_prefs(db: Session, user: User) -> UserPreference:
        prefs = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
        if prefs is None:
            prefs = UserPreference(user_id=user.id)
            db.add(prefs)
            db.commit()
            db.refresh(prefs)
        return prefs

    @staticmethod
    def get_settings(db: Session, user: User) -> UserSettingsResponse:
        prefs = SettingsService.get_or_create_prefs(db, user)
        return UserSettingsResponse(
            notification_preferences=NotificationPreferencesSchema(
                email_new_candidate=prefs.email_new_candidate,
                email_invitation_accepted=prefs.email_invitation_accepted,
                email_system_updates=prefs.email_system_updates,
            ),
            preferences=UIPreferencesSchema(
                theme=prefs.theme,
                language=prefs.language,
                items_per_page=prefs.items_per_page,
            ),
            created_at=prefs.created_at,
            updated_at=prefs.updated_at,
        )

    @staticmethod
    def update_settings(
        db: Session,
        user: User,
        payload: UpdateUserSettingsRequest,
    ) -> UserSettingsResponse:
        prefs = SettingsService.get_or_create_prefs(db, user)

        if payload.notification_preferences is not None:
            n = payload.notification_preferences
            prefs.email_new_candidate = n.email_new_candidate
            prefs.email_invitation_accepted = n.email_invitation_accepted
            prefs.email_system_updates = n.email_system_updates

        if payload.preferences is not None:
            p = payload.preferences
            prefs.theme = p.theme
            prefs.language = p.language
            prefs.items_per_page = p.items_per_page

        db.commit()
        db.refresh(prefs)

        return UserSettingsResponse(
            notification_preferences=NotificationPreferencesSchema(
                email_new_candidate=prefs.email_new_candidate,
                email_invitation_accepted=prefs.email_invitation_accepted,
                email_system_updates=prefs.email_system_updates,
            ),
            preferences=UIPreferencesSchema(
                theme=prefs.theme,
                language=prefs.language,
                items_per_page=prefs.items_per_page,
            ),
            created_at=prefs.created_at,
            updated_at=prefs.updated_at,
        )
