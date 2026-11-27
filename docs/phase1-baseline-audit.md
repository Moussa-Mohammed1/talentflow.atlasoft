# Phase 1: Baseline Implementation Audit — TalentFlow

**Audit Date:** 2026-11-27  
**Scope:** Backend (`backend/`), Database Migrations (`backend/alembic/versions/`), Frontend (`frontend/`), Dependencies, Security, Storage, and Deployment Readiness.

---

## 1. Capability Classification Matrix

Classification legend:
- **Implemented**: Functional end-to-end across routes/UI/persistence.
- **Partial**: Core functionality exists, but has security, scaling, portability, or integration gaps.
- **Planned**: Mentioned in architecture docs/roadmaps or stubs, not wired end-to-end.
- **Missing**: Absent from codebase and infrastructure.

| Domain / Capability | Status | Evidence in Repository | Key Gaps Identified |
|---|---|---|---|
| **Authentication & RBAC** | **Partial** | `backend/app/api/routes/auth.py`, `admin.py`, `core/security.py`, `frontend/proxy.ts`, `SessionProvider.tsx` | Wildcard CORS (`*`), token stored in `localStorage` + JS cookie, `?token=` in LinkedIn callback redirect, cookie set on unused `Response`, `AuthService.login` prints plaintext password & hash to stdout, `GET /api/resumes/` missing `get_current_user`. |
| **User Profile, Invitations & Settings** | **Implemented** | `routes/auth.py`, `routes/settings.py`, `services/invitation_service.py`, `frontend/app/settings/`, `admin/`, `invitations/`, `profile/` | Avatar uploads write directly to `storage/avatars` and mount publicly via `/storage`; invitations routes check user auth (`get_current_user`), not consistently admin-only. |
| **Resume Upload, Parsing & Extraction** | **Partial** | `routes/resume.py`, `services/resume/*` (`analysis_workflow.py`, `identity_service.py`, `language_service.py`, `upload_service.py`), NLP/NER/LLM extractors | Hardcoded local disk paths (`storage/resumes`, `storage/candidate_photos`); in-process FastAPI `BackgroundTasks` instead of distributed worker queue; ML inference runs inside API process. |
| **Candidate Photo Extraction** | **Implemented** | `services/resume_photo_service.py`, `utils/face_detector.py`, `image_extractor.py`, `image_ranker.py` | Writes directly to local `CANDIDATE_PHOTOS_DIR` without storage abstraction; exposed via unauthenticated `/storage`. |
| **Candidate Evaluation & Matching** | **Partial** | `routes/evaluate.py`, `services/evaluation_service.py`, `notification_service.py` | Candidate evaluation & scoring exist, while `candidate_matching_completed` is still marked as an integration hook waiting for external matcher workflow. |
| **Job Offers (CRUD & AI Generation)** | **Implemented** | `routes/job_offers.py`, `services/job_offers_generation_service.py`, `LLM/validate_job_offers.py`, `frontend/app/jobs/` | Relies on synchronous/in-process LLM calls from API request handlers. |
| **Recruitment Pipeline, Interviews & AI Emails** | **Implemented** | `routes/recruitment.py`, `repositories/interview_repository.py`, `frontend/app/recruitments/` | Complete 11-state lifecycle, scheduling, and AI email generation. |
| **Real-Time Notifications & Background Jobs Tracking** | **Partial** | `routes/notification.py`, `routes/job.py`, `notification_manager.py`, `frontend/hooks/useNotifications.ts`, `useJobs.ts` | `NotificationConnectionManager` stores WebSocket connections in-memory per API process (breaks under >1 replica without Redis Pub/Sub); WebSocket auth passes JWT in query string `?token=`. |
| **Bilingual UI (FR / EN) & Dark/Light Mode** | **Implemented** | `frontend/context/LanguageContext.tsx`, `ThemeContext.tsx`, `locales/translations.ts`, `notificationTranslator.ts` | Recently completed across all 19 routes, settings persistence, and notifications. |
| **Error Handling & Observability** | **Missing** | `backend/app/main.py`, `core/database.py` | No structured logging, no `X-Request-ID` correlation ID, no uniform error envelope; `main.py` uses `print()` and `database.py` forces `echo=True`. |
| **File Storage Abstraction (S3 / Local)** | **Missing** | `main.py`, `resume_service.py`, `resume_photo_service.py`, `auth.py` | Direct `Path("storage/...")` file I/O across services; no `StorageBackend` interface. |
| **Frontend Query/Cache Standardization** | **Partial** | `frontend/lib/axios.ts`, `frontend/services/*`, `frontend/stores/*` | Zustand handles auth/toast/jobs/notifications, while pages use ad-hoc `useState`/`useEffect` fetches without standardized `ApiError` parsing or server-state cache. |
| **Containerization (Docker / Compose)** | **Missing** | Repository root | No `Dockerfile`, `.dockerignore`, or `docker-compose.yml`. |
| **Distributed Task Queue & Redis** | **Planned / Missing** | `services/resume/job_manager.py`, `requirements.txt` | Jobs DB model exists (`jobs` table), but execution uses FastAPI `BackgroundTasks`; no Redis/Celery/ARQ installed. |
| **Automated Tests & CI/CD** | **Missing** | `.github/` absent; `pytest==9.1.1` installed in `requirements.txt` | `pytest` package present in backend, but no test suite or `.github/workflows` CI pipeline exists; frontend lacks unit tests. |

---

## 2. Database & Alembic Migrations Inventory (`backend/alembic/versions/`)

Found **29 Alembic migration files** targeting **22+ SQLAlchemy models** under `backend/app/models/`:
- **Core Auth & Users**: `953f9fd95c0d` (users), `62a28961b212` (email verification), `bb219e7cbfea` (avatar), `a7b8c9d0e1f2` (reset code), `c6dc9c60b55f` (LinkedIn OAuth fields), `4ade0f505567` (invitations), `e1d4a6b7c8f9` (user_preferences), `e5f6a7b8c9d0` (llm_usage).
- **Resumes, Candidates & Extraction**: `a8f8f2a4d1c3` (recruiter_id on resumes), `14506f4d150f` (candidate photo), `4573fc0eee2e` (skills), `4290bbc9d5be` (department_skills), `f59cfca3c507` / `b7c9e31a2f44` (experiences -> candidates), `a1b2c3d4e5f6` / `b2c3d4e5f6a7` (talent flags), `8a7b6c5d4e3f` / `a0b1c2d3e4f5` (cascade deletes).
- **Jobs, Notifications & Evaluation**: `c3e8f2a1b4d5` (jobs), `c0b0d849f60b` / `f9653923e9cd` / `fb77119dd8ae` (JobType enum values), `cfec06b73fd4` / `a27df4d3d5fc` (evaluation_results + breakdown), `a41d9f6c21b0` (notifications).
- **Hiring & Job Offers**: `d567a27de0c6` (talent tables), `da1998bef981` (recruitment tables), `c7d8e9f0a1b2` (interviews cleanup), `fa74884689e6` (job_offers).

**Migration Note:** `backend/alembic/env.py` currently reads `backend/app/.env` explicitly and expects `DATABASE_URL`; containerizing migrations needs standard env var precedence (`os.getenv("DATABASE_URL")` first).

---

## 3. Dependencies Audit

### Backend (`backend/requirements.txt` — 129 pinned packages)
- **Web/API**: `fastapi==0.139.0`, `uvicorn==0.46.0`, `SQLAlchemy==2.0.50`, `alembic==1.18.4`, `psycopg[binary]==3.3.4`, `pydantic==2.13.4`, `pydantic-settings==2.14.1`, `PyJWT==2.13.0`, `passlib==1.7.4`, `bcrypt==4.0.1`, `fastapi-mail==1.6.4`.
- **Heavy ML/NLP/Vision coupled into single `requirements.txt`**: `torch==2.11.0`, `transformers==5.8.0`, `sentence-transformers==5.4.1`, `spacy==3.8.13`, `mediapipe==0.10.35`, `opencv-python==5.0.0.93`, `scikit-learn==1.8.0`, `PyMuPDF==1.27.2.3`.
- **Test/Lint/Infra Gaps**: `pytest==9.1.1` is installed, while `redis`, `arq`/`celery`, `boto3`, and `ruff` are not yet added.

### Frontend (`frontend/package.json`)
- **Framework/UI**: `next==16.2.6`, `react==19.2.4`, `react-dom==19.2.4`, `zustand==5.0.14`, `axios==1.16.1`, `lucide-react==1.18.0`, `framer-motion==12.42.2`, `react-pdf==10.4.1`, Tailwind CSS v4.
- **Gaps**: No `@tanstack/react-query` (or server-state caching layer) and no unit-test runner (`vitest`) configured yet.

---

## 4. Phase 1 Remediation Roadmap

1. **Milestone 1 (Security, Config & Observability)**:
   - Validated settings & secrets handling, removal of credential logging, explicit `CORS_ORIGINS`, `X-Request-ID` correlation + structured logging, unified error envelope, hardened JWT/HttpOnly cookie & LinkedIn OAuth exchange flow, `GET /api/resumes/` auth enforcement, `/api/health`, and `pytest` integration tests.
2. **Milestone 2 (Storage & Frontend Standardization)**:
   - `StorageBackend` abstraction (`LocalStorageBackend` + `S3StorageBackend` / MinIO), authenticated resume/avatar download endpoints replacing open `/storage`, frontend `ApiError` normalization + HttpOnly cookie session model (no `localStorage` JWT) + `@tanstack/react-query`.
3. **Milestone 3 (Containerization, Workers & CI/CD)**:
   - `Dockerfile`s, `docker-compose.yml` (`api`, `worker` via `arq`, `frontend`, `postgres`, `redis`, `minio`), Redis Pub/Sub WebSocket bridge, and `.github/workflows/ci.yml`.
