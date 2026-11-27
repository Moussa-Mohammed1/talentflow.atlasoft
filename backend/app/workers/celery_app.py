from __future__ import annotations

import logging

from celery import Celery
from celery.signals import worker_process_init
from kombu import Queue

from app.core.config import settings

logger = logging.getLogger("talentflow.celery")

QUEUE_DEFAULT = "default"
QUEUE_CV_PARSING = "cv_parsing"
QUEUE_AI_WORKFLOWS = "ai_workflows"

celery_app = Celery(
    "talentflow",
    broker=settings.effective_celery_broker_url,
    backend=settings.effective_celery_result_backend,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_always_eager=settings.celery_task_always_eager,
    task_eager_propagates=True,
    task_default_queue=QUEUE_DEFAULT,
    task_queues=(
        Queue(QUEUE_DEFAULT),
        Queue(QUEUE_CV_PARSING),
        Queue(QUEUE_AI_WORKFLOWS),
    ),
    task_routes={
        "talentflow.cv.*": {"queue": QUEUE_CV_PARSING},
        "talentflow.ai.*": {"queue": QUEUE_AI_WORKFLOWS},
        "talentflow.system.*": {"queue": QUEUE_DEFAULT},
    },
    broker_connection_retry_on_startup=True,
)


@worker_process_init.connect
def _on_worker_process_init(**_kwargs) -> None:
    if settings.celery_preload_models:
        from app.workers.model_registry import warmup_worker_models

        warmup_worker_models()
