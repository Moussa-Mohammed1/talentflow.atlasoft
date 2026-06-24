from __future__ import annotations

import asyncio
from collections import defaultdict

from fastapi import WebSocket

from app.models.notification import Notification
from app.schemas.notification import NotificationRead


class NotificationConnectionManager:
    """Tracks WebSocket connections for one API process."""

    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, recruiter_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[recruiter_id].add(websocket)

    async def disconnect(self, recruiter_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            connections = self._connections.get(recruiter_id)
            if connections is None:
                return
            connections.discard(websocket)
            if not connections:
                self._connections.pop(recruiter_id, None)

    async def broadcast(self, notification: Notification) -> None:
        payload = {
            "event": "notification.created",
            "data": NotificationRead.model_validate(notification).model_dump(mode="json"),
        }
        async with self._lock:
            connections = tuple(self._connections.get(notification.recruiter_id, ()))

        stale: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)

        for websocket in stale:
            await self.disconnect(notification.recruiter_id, websocket)


notification_manager = NotificationConnectionManager()
