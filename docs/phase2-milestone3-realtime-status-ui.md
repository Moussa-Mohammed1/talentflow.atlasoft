# Phase 2 — Milestone 3: Real-Time Frontend Status Feedback UI

## Summary

Milestone 3 connects the Next.js frontend to the asynchronous FastAPI + Celery + PostgreSQL + Redis Pub/Sub pipeline so users see immediate acceptance, live percentage progress, current step transitions, retry indicators, and failure details over WebSocket with automatic polling fallback.

---

## Implemented Changes

### 1. Shared Frontend Types, Store & Polling Helper
**Files**:
- `frontend/types/job.ts`
- `frontend/types/notification.ts`
- `frontend/stores/job.store.ts`
- `frontend/services/job.service.ts`

- Extended `JobType` (`certification_extraction`, `job_offer_generation`, `evaluation_validation`) and `Job` interface with `celery_task_id`, `queue_name`, `progress`, `current_step`, `retries`, `max_retries`, `error_details`, `result_payload`, and `updated_at`, plus `JobAcceptedResponse`.
- Extended `NotificationSocketMessage` union with `event: "job.updated"`.
- Added `useJobStore.upsertJob(job)` so live WebSocket/poll updates insert or update tasks in place while counting both `pending` and `running` tasks in `runningCount`.
- Added `jobService.getById(jobId)` and `jobService.waitForJob(jobId, { pollIntervalMs, timeoutMs, onProgress })`, combining real-time Zustand WebSocket updates with `GET /api/jobs/{job_id}` polling fallback.

### 2. WebSocket Event Routing & Active-Job Polling Fallback
**Files**:
- `frontend/hooks/useNotifications.ts`
- `frontend/hooks/useJobs.ts`

- Updated `useNotifications()` WebSocket handler to forward `job.updated` messages straight into `useJobStore.getState().upsertJob(...)`.
- Updated `useJobs()` to poll `GET /api/jobs` every 3 seconds automatically while `runningCount > 0`, ensuring synchronization if WebSocket reconnects or drops.

### 3. Real-Time Background Tasks Drawer (`SystemJobs`)
**Files**:
- `frontend/components/ui/SystemJobs.tsx`

- Added per-job progress bars (`0–100%`), current execution step labels (`current_step`), queue badges (`cv_parsing`, `ai_workflows`), retry counters (`retries > 0`), and explicit `error_details` blocks in FR/EN.

### 4. Non-Blocking Async Resume Import & AI Job Offer Generation
**Files**:
- `frontend/services/resume.service.ts`
- `frontend/hooks/useResumeImport.ts`
- `frontend/components/resume/ImportProgress/AnalyzingResumeModal.tsx`
- `frontend/components/resume/ImportProgress/ImportProgressModal.tsx`
- `frontend/components/resume/ImportProgress/ErrorProcessModal.tsx`
- `frontend/components/resume/ImportResumeButton.tsx`
- `frontend/services/job-offers.service.ts`
- `frontend/app/jobs/page.tsx`

- Switched `useResumeImport()` from blocking `POST /resumes/analyze` to non-blocking `POST /resumes/analyze-async` (`202 Accepted`) + `jobService.waitForJob(...)`, driving live `progress` and `currentStep` inside `AnalyzingResumeModal` and displaying worker failure messages in `ErrorProcessModal`.
- Switched AI job offer generation on `frontend/app/jobs/page.tsx` to `POST /job-offers/generate-async` (`202 Accepted`) + `jobService.waitForJob(...)` before refreshing the offer list.

---

## Verification

- Added unit tests in `frontend/__tests__/job-store.test.ts`.
- Verified via `pytest`, `ruff check`, `npx tsc --noEmit`, `npx eslint`, `npm test`, and `npm run build`.
