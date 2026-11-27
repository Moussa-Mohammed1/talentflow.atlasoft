from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger("talentflow.redis")


def create_async_redis() -> Any | None:
    """Create an async Redis client when REDIS_URL is configured, else None."""
    url = (settings.redis_url or "").strip()
    if not url:
        return None
    import redis.asyncio as aioredis

    return aioredis.from_url(url, decode_responses=True)


async def ping_redis() -> str:
    """Return 'skipped' when REDIS_URL is unset, 'ok' when reachable, else raise."""
    client = create_async_redis()
    if client is None:
        return "skipped"
    try:
        await client.ping()
        return "ok"
    finally:
        await client.aclose()
