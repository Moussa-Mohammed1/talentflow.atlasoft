from __future__ import annotations

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.activity import ActivityListRead, ActivityRead

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.get("", response_model=ActivityListRead)
def list_activities(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityListRead:
    now = datetime.utcnow()

    sql = text("""
        (
            SELECT
                r.id,
                'resume_analyzed' AS type,
                CONCAT(
                    'L''analyse du résumé de ', c.fullname,
                    ' importé par ', u.fullname,
                    ' a été complétée avec succès'
                ) AS description,
                c.fullname AS candidate_name,
                u.fullname AS recruiter_name,
                NULL AS invited_name,
                COALESCE(c.created_at, r.created_at) AS created_at
            FROM resumes r
            JOIN users u ON u.id = r.recruiter_id
            JOIN candidats c ON c.resume_id = r.id
            WHERE r.recruiter_id = :uid
        )
        UNION ALL
        (
            SELECT
                inv.id,
                'invitation_accepted',
                CONCAT(
                    'L''invitation de ', COALESCE(invited.fullname, inv.email),
                    ' a été acceptée'
                ),
                NULL,
                u.fullname,
                COALESCE(invited.fullname, inv.email),
                COALESCE(invited.created_at, inv.created_at)
            FROM invitations inv
            JOIN users u ON u.id = inv.invited_by
            JOIN users invited ON invited.email = inv.email
            WHERE inv.invited_by = :uid AND inv.accepted = TRUE
        )
        UNION ALL
        (
            SELECT
                inv.id,
                'invitation_refused',
                CONCAT(
                    'L''invitation de ', COALESCE(invited.fullname, inv.email),
                    ' a été refusée'
                ),
                NULL,
                u.fullname,
                COALESCE(invited.fullname, inv.email),
                inv.expires_at
            FROM invitations inv
            JOIN users u ON u.id = inv.invited_by
            LEFT JOIN users invited ON invited.email = inv.email
            WHERE inv.invited_by = :uid
              AND inv.accepted = FALSE
              AND inv.expires_at < :now
        )
        ORDER BY created_at DESC
        LIMIT :lim
    """)

    rows = db.execute(sql, {"uid": current_user.id, "lim": limit, "now": now}).fetchall()

    items = [
        ActivityRead(
            id=row.id,
            type=row.type,
            description=row.description,
            candidate_name=row.candidate_name,
            recruiter_name=row.recruiter_name,
            invited_name=row.invited_name,
            created_at=row.created_at,
        )
        for row in rows
    ]

    return ActivityListRead(items=items)
