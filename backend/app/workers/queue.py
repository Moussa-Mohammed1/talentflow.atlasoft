from __future__ import annotations

from typing import Any

from app.core.config import settings


def parse_redis_settings():
    from arq.connections import RedisSettings

    url = (settings.redis_url or "").strip() or "redis://localhost:6379/0"
    return RedisSettings.from_dsn(url)


async def enqueue_task(task_name: str, *args: Any, **kwargs: Any) -> str | None:
    """Enqueue a task on ARQ/Redis when REDIS_URL is configured."""
    if not (settings.redis_url or "").strip():
        return None
    from arq import create_pool

    pool = await create_pool(parse_redis_settings())
    try:
        job = await pool.enqueue_job(task_name, *args, **kwargs)
        return job.job_id if job is not None else None
    finally:
        await pool.close()
