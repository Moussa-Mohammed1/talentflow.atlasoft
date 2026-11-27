# Phase 1 — Milestone 2: Storage Abstraction & Frontend State Standardization

**Completed:** 2026-11-27  
**Scope:** Portable Object Storage (`StorageBackend`), Authenticated Media Serving, Cookie-Only Frontend Session with Auto-Refresh, `ApiError` Normalization, and `@tanstack/react-query`.

---

## 1. Backend Storage Abstraction (`backend/app/services/storage/`)

- **Interface & Key Safety** ([base.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/services/storage/base.py)):
  - Defined abstract `StorageBackend` (`save_bytes`, `save_file`, `read_bytes`, `open_local_path`, `delete`, `exists`, `size`).
  - Added `normalize_storage_key` converting legacy `storage/...` / `/storage/...` / Windows `\` paths into canonical POSIX keys while rejecting empty keys and `..` path traversal.
- **Implementations**:
  - `LocalStorageBackend` ([local.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/services/storage/local.py)) rooted at configurable `STORAGE_ROOT` with containment checks.
  - `S3StorageBackend` ([s3.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/services/storage/s3.py)) using `boto3` (`S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_USE_SSL`) compatible with MinIO and AWS S3, yielding temporary files via `open_local_path` that auto-clean on exit.
  - `get_storage_backend()` factory ([factory.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/services/storage/factory.py)) configured in [config.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/core/config.py) (`STORAGE_BACKEND=local|s3`).
- **Domain Refactor & Unauthenticated `/storage` Removal**:
  - Removed the public unauthenticated `app.mount("/storage", StaticFiles(...))` from [main.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/main.py).
  - Added authenticated media route `GET /api/files/{file_key:path}` ([files.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/api/routes/files.py)) requiring `get_current_user`, restricting prefixes to `avatars/`, `candidate_photos/`, and `resumes/`, and sending `Cache-Control: private` + `X-Content-Type-Options: nosniff`.
  - Refactored resume uploads/downloads/previews/deletions ([resume_service.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/services/resume_service.py), [resume_loader.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/services/resume/resume_loader.py), [routes/resume.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/api/routes/resume.py)), candidate photo storage ([resume_photo_service.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/services/resume_photo_service.py)), avatars ([auth_service.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/services/auth_service.py), [routes/auth.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/api/routes/auth.py)), evaluation finalize ([evaluation_service.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/services/evaluation_service.py)), and all resume extractors (`analysis_workflow.py`, `identity_service.py`, `skill_service.py`, `experience_service.py`, `education_service.py`, `certification_service.py`, `language_service.py`, `preview_service.py`) to use `StorageBackend` / `open_file`.
- **Short-Lived WebSocket Ticket**:
  - Added single-use 30s `create_ws_ticket` / `consume_ws_ticket` ([security.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/core/security.py)) and `POST /api/notifications/ws-ticket` ([routes/notification.py](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/backend/app/api/routes/notification.py)) so browsers no longer need long-lived JWTs in `localStorage` or WebSocket query URLs.

---

## 2. Frontend Session, Error Envelope & React Query Standardization

- **Same-Origin Proxy & Cookie Session**:
  - Added `/api/:path*` Next.js rewrite in [next.config.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/next.config.ts) (`BACKEND_INTERNAL_URL` / `NEXT_PUBLIC_API_URL`) so browser API requests and `HttpOnly` session cookies work cleanly on same-origin.
  - Eliminated `localStorage` / `document.cookie` JWT storage across [axios.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/lib/axios.ts), [auth.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/lib/auth.ts), [auth.store.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/stores/auth.store.ts), [SessionProvider.tsx](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/components/auth/SessionProvider.tsx), [LoginForm.tsx](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/components/auth/LoginForm.tsx), [useAuth.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/hooks/useAuth.ts), [useNotifications.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/hooks/useNotifications.ts), and [useJobs.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/hooks/useJobs.ts).
  - Added single-flight `401 -> POST /api/auth/refresh -> retry` logic inside [axios.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/lib/axios.ts).
- **Error Envelope Normalization & Media Helper**:
  - Created [api-error.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/lib/api-error.ts) defining `ApiError` (`status`, `code`, `message`, `details`, `correlationId`, `isNetworkError`) + `normalizeApiError` + `getErrorMessage`.
  - Created [media.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/lib/media.ts) (`resolveMediaUrl`) and migrated candidate/avatar images across talents, evaluations, recruitments, and document resume modals to `/api/files/...`.
- **TanStack React Query**:
  - Installed `@tanstack/react-query` in `frontend/package.json`.
  - Added [query-client.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/lib/query-client.ts), [query-keys.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/lib/query-keys.ts), [QueryProvider.tsx](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/components/providers/QueryProvider.tsx), and [useAppQueries.ts](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/hooks/queries/useAppQueries.ts), wired into [layout.tsx](file:///c:/Users/mouss/OneDrive/Desktop/career/projects/talentflow.atlasoft/frontend/app/layout.tsx).
