from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import correlation_id_ctx

logger = logging.getLogger("talentflow.errors")

_STATUS_TO_CODE = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    500: "INTERNAL_SERVER_ERROR",
    502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE",
}


def status_to_error_code(status_code: int) -> str:
    return _STATUS_TO_CODE.get(status_code, f"HTTP_{status_code}")


def build_error_payload(
    *,
    code: str,
    message: str,
    details: Any = None,
    correlation_id: str | None = None,
) -> dict[str, Any]:
    cid = correlation_id or correlation_id_ctx.get()
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "correlation_id": cid,
        },
        # Backward-compatible field for existing frontend clients checking data.detail
        "detail": message,
    }


def _extract_correlation_id(request: Request) -> str:
    cid = getattr(request.state, "correlation_id", None) or correlation_id_ctx.get()
    return cid or "-"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException | StarletteHTTPException,
    ) -> JSONResponse:
        cid = _extract_correlation_id(request)
        if isinstance(exc.detail, dict):
            message = str(exc.detail.get("message") or exc.detail.get("detail") or "Request failed")
            code = str(exc.detail.get("code") or status_to_error_code(exc.status_code))
            details = exc.detail.get("details")
        else:
            message = str(exc.detail) if exc.detail else "Request failed"
            code = status_to_error_code(exc.status_code)
            details = None

        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_payload(
                code=code,
                message=message,
                details=details,
                correlation_id=cid,
            ),
            headers=getattr(exc, "headers", None) or {"X-Request-ID": cid},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        cid = _extract_correlation_id(request)
        errors = [
            {
                "loc": list(err.get("loc", ())),
                "msg": err.get("msg", ""),
                "type": err.get("type", ""),
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=build_error_payload(
                code="VALIDATION_ERROR",
                message="Validation error",
                details=errors,
                correlation_id=cid,
            ),
            headers={"X-Request-ID": cid},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        cid = _extract_correlation_id(request)
        logger.exception("Unhandled error during %s %s", request.method, request.url.path, exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=build_error_payload(
                code="INTERNAL_SERVER_ERROR",
                message="Internal server error",
                details=None,
                correlation_id=cid,
            ),
            headers={"X-Request-ID": cid},
        )
