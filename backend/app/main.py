from __future__ import annotations

import logging
import re
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.routes.notification import websocket_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, correlation_id_ctx

configure_logging(settings.log_level)
logger = logging.getLogger("talentflow.http")

_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate_runtime_security()
    yield


app = FastAPI(title="TalentFlow API", lifespan=lifespan)

register_exception_handlers(app)


@app.middleware("http")
async def correlation_and_logging_middleware(request: Request, call_next):
    incoming_id = (request.headers.get("X-Request-ID") or "").strip()
    correlation_id = incoming_id if _VALID_REQUEST_ID.match(incoming_id) else uuid.uuid4().hex
    request.state.correlation_id = correlation_id
    token = correlation_id_ctx.set(correlation_id)

    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    finally:
        correlation_id_ctx.reset(token)

    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    response.headers["X-Request-ID"] = correlation_id
    logger.info(
        "%s %s -> %s (%.2fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


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

