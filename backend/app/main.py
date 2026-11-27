from __future__ import annotations

import logging
import re
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.router import api_router
from app.api.routes.notification import websocket_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, correlation_id_ctx
from app.services.notification_manager import notification_manager

configure_logging(settings.log_level)
logger = logging.getLogger("talentflow.http")

_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class CorrelationLoggingMiddleware:
    """Pure ASGI middleware propagating X-Request-ID across exception handlers and logs."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = MutableHeaders(scope=scope)
        incoming_id = (headers.get("X-Request-ID") or "").strip()
        correlation_id = incoming_id if _VALID_REQUEST_ID.match(incoming_id) else uuid.uuid4().hex
        scope.setdefault("state", {})["correlation_id"] = correlation_id
        token = correlation_id_ctx.set(correlation_id)

        started_at = time.perf_counter()
        status_code = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                resp_headers = MutableHeaders(scope=message)
                resp_headers["X-Request-ID"] = correlation_id
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
            logger.info(
                "%s %s -> %s (%.2fms)",
                scope.get("method", "HTTP"),
                scope.get("path", "/"),
                status_code,
                duration_ms,
            )
            correlation_id_ctx.reset(token)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate_runtime_security()
    await notification_manager.start_listener()
    try:
        yield
    finally:
        await notification_manager.stop_listener()


app = FastAPI(title="TalentFlow API", lifespan=lifespan)

register_exception_handlers(app)

app.add_middleware(CorrelationLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "Accept"],
    expose_headers=["X-Request-ID"],
)

app.include_router(api_router, prefix="/api")
app.include_router(websocket_router)
