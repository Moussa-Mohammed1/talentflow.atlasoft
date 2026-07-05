from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.security import decode_access_token, get_current_user
from app.models.user import User
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import (
    CandidateMatchingCompletedEvent,
    NotificationListRead,
    NotificationMarkAllRead,
    NotificationRead,
)
from app.services.notification_manager import notification_manager
from app.services.notification_service import NotificationService


router = APIRouter(prefix="/notifications", tags=["Notifications"])
websocket_router = APIRouter(tags=["Notifications"])


@router.get("", response_model=NotificationListRead)
def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationListRead:
    items = NotificationRepository.get_by_recruiter(
        db,
        recruiter_id=current_user.id,
        limit=limit,
        unread_only=unread_only,
    )
    return NotificationListRead(
        items=[NotificationRead.model_validate(item) for item in items],
        unread_count=NotificationRepository.unread_count(db, recruiter_id=current_user.id),
    )


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationRead:
    notification = NotificationRepository.mark_as_read(
        db,
        notification_id=notification_id,
        recruiter_id=current_user.id,
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return NotificationRead.model_validate(notification)


@router.delete("", status_code=status.HTTP_200_OK)
def delete_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    count = NotificationRepository.delete_all_by_recruiter(db, recruiter_id=current_user.id)
    return {"deleted": count}


@router.patch("/read-all", response_model=NotificationMarkAllRead)
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationMarkAllRead:
    updated_count = NotificationRepository.mark_all_as_read(db, recruiter_id=current_user.id)
    return NotificationMarkAllRead(updated_count=updated_count)


@router.post(
    "/events/candidate-matching-completed",
    response_model=NotificationRead,
    status_code=status.HTTP_201_CREATED,
)
def candidate_matching_completed(
    payload: CandidateMatchingCompletedEvent,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationRead:
    """Event boundary for the matching worker; recruiter ownership comes from the token."""
    notification = NotificationService.candidate_matching_completed(
        db,
        recruiter_id=current_user.id,
        candidate_name=payload.candidate_name,
        match_count=payload.match_count,
    )
    background_tasks.add_task(notification_manager.broadcast, notification)
    return NotificationRead.model_validate(notification)


@websocket_router.websocket("/ws/notifications/{recruiter_id}")
async def notification_websocket(
    websocket: WebSocket,
    recruiter_id: int,
    token: str = Query(..., min_length=1),
) -> None:
    try:
        token_user_id = decode_access_token(token)
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid access token")
        return

    if token_user_id != recruiter_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Recruiter mismatch")
        return

    with SessionLocal() as db:
        user = db.query(User).filter(User.id == token_user_id, User.is_active.is_(True)).first()
    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Inactive user")
        return

    await notification_manager.connect(recruiter_id, websocket)
    try:
        await websocket.send_json({"event": "notifications.connected", "data": {"recruiter_id": recruiter_id}})
        while True:
            
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await notification_manager.disconnect(recruiter_id, websocket)
