from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

from app.core.config import settings
from app.core.redis import create_async_redis
from app.models.notification import Notification
from app.schemas.notification import NotificationRead

logger = logging.getLogger("talentflow.notifications")
NOTIFICATION_CHANNEL = "talentflow:notifications"


class NotificationConnectionManager:
    """Tracks WebSocket connections and bridges notifications across processes via Redis Pub/Sub."""

    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()
        self._listener_task: asyncio.Task[None] | None = None

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

    async def deliver_local(self, recruiter_id: int, payload: dict[str, Any]) -> None:
        async with self._lock:
            connections = tuple(self._connections.get(recruiter_id, ()))

        stale: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)

        for websocket in stale:
            await self.disconnect(recruiter_id, websocket)

    async def handle_pubsub_message(self, raw_data: str) -> None:
        try:
            envelope = json.loads(raw_data)
            recruiter_id = int(envelope["recruiter_id"])
            payload = envelope["payload"]
        except (ValueError, KeyError, TypeError):
            logger.warning("Ignoring malformed Redis notification message")
            return
        await self.deliver_local(recruiter_id, payload)

    async def broadcast_payload(self, recruiter_id: int, payload: dict[str, Any]) -> None:
        client = create_async_redis()
        if client is not None:
            try:
                envelope = json.dumps({"recruiter_id": recruiter_id, "payload": payload})
                await client.publish(NOTIFICATION_CHANNEL, envelope)
                return
            except Exception:
                logger.warning("Redis publish failed; falling back to local WebSocket delivery")
            finally:
                await client.aclose()

        await self.deliver_local(recruiter_id, payload)

    async def broadcast(self, notification: Notification) -> None:
        payload = {
            "event": "notification.created",
            "data": NotificationRead.model_validate(notification).model_dump(mode="json"),
        }
        await self.broadcast_payload(notification.recruiter_id, payload)

    def publish_sync(self, recruiter_id: int, payload: dict[str, Any]) -> None:
        """Synchronous publish for Celery worker processes and sync FastAPI endpoints."""
        envelope = json.dumps({"recruiter_id": recruiter_id, "payload": payload})
        url = (settings.redis_url or "").strip()
        if url:
            try:
                import redis as sync_redis

                client = sync_redis.from_url(url, decode_responses=True)
                try:
                    client.publish(NOTIFICATION_CHANNEL, envelope)
                    return
                finally:
                    client.close()
            except Exception:
                logger.warning("Sync Redis publish failed; attempting local fallback")

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.deliver_local(recruiter_id, payload))
        except RuntimeError:
            # No running event loop (e.g., synchronous worker/test without Redis)
            pass

    async def start_listener(self) -> None:
        if self._listener_task is not None and not self._listener_task.done():
            return
        client = create_async_redis()
        if client is None:
            return

        async def _listen() -> None:
            pubsub = client.pubsub()
            try:
                await pubsub.subscribe(NOTIFICATION_CHANNEL)
                async for message in pubsub.listen():
                    if message.get("type") == "message" and isinstance(message.get("data"), str):
                        await self.handle_pubsub_message(message["data"])
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Redis notification listener terminated unexpectedly")
            finally:
                with contextlib.suppress(Exception):
                    await pubsub.unsubscribe(NOTIFICATION_CHANNEL)
                    await pubsub.aclose()
                    await client.aclose()

        self._listener_task = asyncio.create_task(_listen())

    async def stop_listener(self) -> None:
        if self._listener_task is None:
            return
        self._listener_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._listener_task
        self._listener_task = None


notification_manager = NotificationConnectionManager()
