from __future__ import annotations

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType


class NotificationRepository:
    """Database access for recruiter-owned notifications."""

    @staticmethod
    def create(
        db: Session,
        *,
        recruiter_id: int,
        title: str,
        message: str,
        notification_type: NotificationType,
    ) -> Notification:
        notification = Notification(
            recruiter_id=recruiter_id,
            title=title,
            message=message,
            type=notification_type,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def get_by_recruiter(
        db: Session,
        *,
        recruiter_id: int,
        limit: int = 50,
        unread_only: bool = False,
    ) -> list[Notification]:
        statement = select(Notification).where(Notification.recruiter_id == recruiter_id)
        if unread_only:
            statement = statement.where(Notification.is_read.is_(False))
        statement = statement.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit)
        return list(db.scalars(statement).all())

    @staticmethod
    def unread_count(db: Session, *, recruiter_id: int) -> int:
        statement = select(func.count(Notification.id)).where(
            Notification.recruiter_id == recruiter_id,
            Notification.is_read.is_(False),
        )
        return int(db.scalar(statement) or 0)

    @staticmethod
    def mark_as_read(
        db: Session,
        *,
        notification_id: int,
        recruiter_id: int,
    ) -> Notification | None:
        notification = db.scalar(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.recruiter_id == recruiter_id,
            )
        )
        if notification is None:
            return None
        if not notification.is_read:
            notification.is_read = True
            db.commit()
            db.refresh(notification)
        return notification

    @staticmethod
    def delete_all_by_recruiter(db: Session, *, recruiter_id: int) -> int:
        notifications = db.scalars(
            select(Notification).where(Notification.recruiter_id == recruiter_id)
        ).all()
        count = len(notifications)
        for n in notifications:
            db.delete(n)
        db.commit()
        return count

    @staticmethod
    def mark_all_as_read(db: Session, *, recruiter_id: int) -> int:
        result = db.execute(
            update(Notification)
            .where(
                Notification.recruiter_id == recruiter_id,
                Notification.is_read.is_(False),
            )
            .values(is_read=True)
        )
        db.commit()
        return int(result.rowcount or 0)
