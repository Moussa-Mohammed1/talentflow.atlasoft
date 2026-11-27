# Phase 2 — Milestone 2: Celery Workers, Queues & Per-Process Model Preloading

## Summary

Milestone 2 moves long-running CV parsing and LLM/agent workflows off the FastAPI request/response cycle onto dedicated Celery worker queues, initializes heavy ML/vision models once per worker process, configures bounded exponential retries, and exposes non-blocking `HTTP 202 Accepted` endpoints.

---

## Implemented Changes

### 1. Celery Application & Queue Routing
**Files**:
- `backend/app/workers/celery_app.py`

- Configured dedicated Celery queues using Kombu:
  - `default` (`talentflow.system.*`)
  - `cv_parsing` (`talentflow.cv.*`)
  - `ai_workflows` (`talentflow.ai.*`)
- Reliability & worker execution defaults:
  - `task_acks_late=True` and `worker_prefetch_multiplier=1` to avoid losing tasks or hoarding work across uneven CV/LLM workloads.
  - `task_soft_time_limit=240`, `task_time_limit=300`.
  - `broker_connection_retry_on_startup=True`.
- Connected `@worker_process_init.connect` hook to invoke `warmup_worker_models()` when `CELERY_PRELOAD_MODELS=true`.

### 2. Per-Worker-Process Model Singleton Registry
**Files**:
- `backend/app/workers/model_registry.py`
- `backend/app/services/skill_extraction/ontology.py`
- `backend/app/services/skill_extraction/pipeline.py`

- Added `get_shared_ontology(preload_embeddings=...)` and `warmup_worker_models()` to load heavyweight ML/vision singletons (`SkillOntology` multilingual embeddings and `FaceDetector`) once per worker process rather than per request or per task.
- Added process-level caches (`_EMBEDDING_MODEL_INSTANCE`, `_CATEGORY_EMBEDDINGS_CACHE`, `_CONCEPT_EMBEDDINGS_CACHE`) in `SkillOntology.ensure_embeddings()` and wired `ResumeSkillExtractionPipeline.__init__` to reuse `get_shared_ontology(preload_embeddings=False)`.

### 3. Tracked Tasks, Bounded Retries & Non-Blocking Dispatcher
**Files**:
- `backend/app/workers/tasks.py`
- `backend/app/workers/dispatcher.py`

- Implemented `TrackedCeleryTask` base class:
  - `autoretry_for = (Exception,)`
  - `max_retries = 3`
  - `retry_backoff = True`, `retry_backoff_max = 60`, `retry_jitter = True`
  - `on_retry()` and `on_failure()` hooks synchronize PostgreSQL `Job` retry counts, error messages, and tracebacks, emitting live `job.updated` WebSocket/PubSub events.
- Implemented worker tasks and reusable execution helpers:
  - `talentflow.cv.analyze_resume` (`cv_parsing` queue)
  - `talentflow.ai.evaluate_candidate` (`ai_workflows` queue)
  - `talentflow.ai.generate_job_offer` (`ai_workflows` queue)
  - `talentflow.system.ping` (`default` queue)
- Implemented `dispatch_background_job(...)`:
  1. Creates the durable `Job` row in PostgreSQL immediately (`PENDING`, `progress=0`).
  2. When Celery/Redis is configured (or `celery_task_always_eager=True`), calls `celery_app.send_task(..., queue=...)`, binds `celery_task_id`, and returns `JobAcceptedResponse`.
  3. When running without Redis/Celery broker configured (local fallback), dispatches the same tracked execution coroutine via FastAPI `BackgroundTasks`.

### 4. Non-Blocking `202 Accepted` Endpoints & Job Polling Route
**Files**:
- `backend/app/api/routes/job.py`: Added `GET /api/jobs/{job_id}` (recruiter-scoped).
- `backend/app/api/routes/resume.py`: Added `POST /api/resumes/analyze-async` and `POST /api/resumes/re-analyze-async` (`202 Accepted`, `cv_parsing`).
- `backend/app/api/routes/evaluate.py`: Added `POST /api/evaluate/async` (`202 Accepted`, `ai_workflows`).
- `backend/app/api/routes/job_offers.py`: Added `POST /api/job-offers/generate-async` (`202 Accepted`, `ai_workflows`).

### 5. Container Worker Runtime
**Files**:
- `docker-compose.yml`

- Updated the `worker` container command to run:
  `celery -A app.workers.celery_app.celery_app worker -Q cv_parsing,ai_workflows,default -l info --concurrency=2`
  with `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, and `CELERY_PRELOAD_MODELS=true`.
