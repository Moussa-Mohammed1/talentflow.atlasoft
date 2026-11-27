# Phase 2 — Milestone 1: Durable Job Tracking & Celery Core Setup

**Completed:** 2026-11-27  
**Scope:** PostgreSQL `jobs` Schema Extension via Alembic, Extended Schemas/Repository/Service, and Celery + Redis Configuration.

---

## 1. PostgreSQL Job Tracking Extension (`jobs` table)

- **Model (`Job` & `JobType`)** ([models/job.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/models/job.py)):
  - Extended `JobType` enum with `JOB_OFFER_GENERATION` (`"job_offer_generation"`) and `EVALUATION_VALIDATION` (`"evaluation_validation"`).
  - Extended `Job` with durable async tracking columns:
    - `celery_task_id` (`String(255)`, indexed)
    - `queue_name` (`String(64)`, default `"default"`)
    - `progress` (`Integer`, `0`–`100`)
    - `current_step` (`String(128)`, nullable)
    - `retries` / `max_retries` (`Integer`, defaults `0` / `3`)
    - `error_details` (`Text`, nullable)
    - `result_payload` (`JSON`, nullable)
    - `updated_at` (`DateTime(timezone=True)`, `onupdate=func.now()`)
- **Alembic Migration** ([c9e1a3b7d402_extend_jobs_for_celery_tracking.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/alembic/versions/c9e1a3b7d402_extend_jobs_for_celery_tracking.py)):
  - Chains cleanly onto `a27df4d3d5fc`, safely extends PostgreSQL `job_type_enum` (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`), adds all tracking columns and `ix_jobs_celery_task_id`, and supports clean `downgrade()`.

## 2. Schemas, Repository & Real-Time Job Service

- **Schemas** ([schemas/job.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/schemas/job.py)):
  - Updated `JobCreate`, `JobRead`, `JobStatusUpdate`, and added `JobAcceptedResponse` (`job_id`, `celery_task_id`, `status`, `queue_name`, `job`).
- **Repository & Service** ([job_repository.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/repositories/job_repository.py), [job_service.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/services/job_service.py)):
  - `count_running_by_recruiter` now tracks both `PENDING` and `RUNNING` jobs.
  - Added `get_job`, `attach_celery_task`, `set_progress`, and `record_retry`.
  - Every `JobService` state transition (`create_job`, `start_job`, `set_progress`, `record_retry`, `complete_job`, `fail_job`) publishes a `job.updated` event via `notification_manager.publish_sync(...)` (Redis Pub/Sub -> WebSocket).

## 3. Celery & Redis Configuration

- **Settings** ([config.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/core/config.py), [backend/app/.env.example](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/.env.example)):
  - Added `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `CELERY_TASK_ALWAYS_EAGER`, and `CELERY_PRELOAD_MODELS` (pinned `celery==5.7.0` in [requirements.txt](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/requirements.txt)).
