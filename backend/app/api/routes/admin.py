from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.resume import Resume
from app.models.llm_usage import LLMUsage
from app.schemas.admin import AdminUserResponse
from app.schemas.auth import UserStatsResponse, LLMUsageByAction
import os
router = APIRouter(prefix="/admin", tags=["Admin"])


class UpdateUserRoleRequest(BaseModel):
    role: str


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les administrateurs peuvent accéder à cette ressource",
        )
    return current_user
APP_URL = os.getenv("APP_URL")


def build_avatar_url(avatar: str | None) -> str | None:
    if not avatar:
        return None
    if avatar.startswith("/"):
        return f"{APP_URL}{avatar}"
    return avatar


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    resume_counts = (
        db.query(
            Resume.recruiter_id,
            func.count(Resume.id).label("count"),
        )
        .group_by(Resume.recruiter_id)
        .subquery()
    )

    llm_counts = (
        db.query(
            LLMUsage.recruiter_id,
            func.count(LLMUsage.id).label("count"),
        )
        .group_by(LLMUsage.recruiter_id)
        .subquery()
    )

    users = (
        db.query(
            User,
            func.coalesce(resume_counts.c.count, 0).label("resume_count"),
            func.coalesce(llm_counts.c.count, 0).label("llm_count"),
        )
        .outerjoin(resume_counts, User.id == resume_counts.c.recruiter_id)
        .outerjoin(llm_counts, User.id == llm_counts.c.recruiter_id)
        .order_by(User.created_at.desc())
        .all()
    )

    return [
        AdminUserResponse(
            id=user.User.id,
            fullname=user.User.fullname,
            email=user.User.email,
            avatar=build_avatar_url(user.User.avatar),
            role=user.User.role,
            is_active=user.User.is_active,
            created_at=user.User.created_at,
            resume_count=user.resume_count,
            successful_llm_requests=user.llm_count,
        )
        for user in users
    ]


@router.get("/users/{user_id}/stats", response_model=UserStatsResponse)
def get_user_stats(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    resume_count = (
        db.query(func.count(Resume.id))
        .filter(Resume.recruiter_id == target.id)
        .scalar() or 0
    )
    llm_count = (
        db.query(func.count(LLMUsage.id))
        .filter(LLMUsage.recruiter_id == target.id)
        .scalar() or 0
    )
    llm_by_action_rows = (
        db.query(LLMUsage.action, func.count(LLMUsage.id).label("count"))
        .filter(LLMUsage.recruiter_id == target.id)
        .group_by(LLMUsage.action)
        .all()
    )
    llm_usage_by_action = [
        LLMUsageByAction(action=row.action, count=row.count)
        for row in llm_by_action_rows
    ]

    return UserStatsResponse(
        resume_count=resume_count,
        successful_llm_requests=llm_count,
        llm_usage_by_action=llm_usage_by_action,
    )


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UpdateUserRoleRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if payload.role not in {role.value for role in UserRole}:
        raise HTTPException(status_code=400, detail="Rôle invalide")

    target.role = payload.role
    db.commit()
    db.refresh(target)

    new_resume_count = (
        db.query(func.count(Resume.id))
        .filter(Resume.recruiter_id == target.id)
        .scalar() or 0
    )
    new_llm_count = (
        db.query(func.count(LLMUsage.id))
        .filter(LLMUsage.recruiter_id == target.id)
        .scalar() or 0
    )

    return {"message": "Rôle mis à jour avec succès", "user": AdminUserResponse(
        id=target.id,
        fullname=target.fullname,
        email=target.email,
        avatar=build_avatar_url(target.avatar),
        role=target.role,
        is_active=target.is_active,
        created_at=target.created_at,
        resume_count=new_resume_count,
        successful_llm_requests=new_llm_count,
    )}
