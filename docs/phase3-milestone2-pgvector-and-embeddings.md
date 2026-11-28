# Phase 3 — Milestone 2: pgvector Extension & Profile/Job Embedding Pipeline

## Summary

Milestone 2 enables the PostgreSQL `pgvector` extension via Alembic migrations and introduces a reusable embedding pipeline that generates and stores 384-dimensional normalized vector embeddings for candidate profile/section chunks and job offer descriptions.

---

## Implemented Changes

### 1. pgvector Infrastructure & Dialect-Aware SQLAlchemy Column
**Files**:
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `backend/requirements.txt`
- `backend/app/core/config.py`
- `backend/app/models/embeddings.py`
- `backend/app/models/__init__.py`

- Switched PostgreSQL container images in `docker-compose.yml` and `.github/workflows/ci.yml` from `postgres:16-alpine` to `pgvector/pgvector:pg16`.
- Added `pgvector==0.3.6` to `backend/requirements.txt` and embedding configuration (`embedding_model_name`, `embedding_dimension`, `embedding_local_files_only`) to `Settings`.
- Implemented `PgVectorType` (`EMBEDDING_DIMENSION = 384`) in `backend/app/models/embeddings.py`:
  - Uses `pgvector.sqlalchemy.Vector(384)` (or raw `vector(384)` fallback) on PostgreSQL when `pg_available_extensions` reports `vector` is installed (checked once on SQLAlchemy `Engine` `first_connect`), with `.cosine_distance()` (`<=>`) and `.l2_distance()` (`<->`) operators.
  - Falls back cleanly to `JSON` on SQLite or bare-metal PostgreSQL instances where the `pgvector` server extension is not installed.
- Created SQLAlchemy models `CandidateEmbedding` (`candidate_embeddings` with unique `(candidate_id, chunk_type, chunk_index)`) and `JobOfferEmbedding` (`job_offer_embeddings` with unique `job_offer_id`).

### 2. Alembic Migration for pgvector & HNSW Indexes
**Files**:
- `backend/alembic/versions/e2a3b4c5d6f7_enable_pgvector_and_create_embedding_tables.py`

- On PostgreSQL dialects where `pg_available_extensions` includes `'vector'`, runs `CREATE EXTENSION IF NOT EXISTS vector`, creates `vector(384)` columns, and builds HNSW cosine similarity indexes (`USING hnsw (embedding vector_cosine_ops)`).
- On bare-metal PostgreSQL servers without `pgvector` installed (or SQLite), logs a warning and creates `JSON` embedding columns without HNSW indexes so `alembic upgrade head` still succeeds.

### 3. Chunking, SentenceTransformer Embedding Service & Indexing Hooks
**Files**:
- `backend/app/services/embeddings/embedder.py`
- `backend/app/services/embeddings/chunker.py`
- `backend/app/services/embeddings/indexer.py`
- `backend/app/services/embeddings/__init__.py`
- `backend/app/workers/model_registry.py`
- `backend/app/services/resume/persistence_service.py`
- `backend/app/services/job_offers_service.py`

- Added `EmbeddingService` wrapping `SentenceTransformer` (`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, cached once per worker process via `model_registry.get_shared_embedding_service()`), with a deterministic L2-normalized `DeterministicHashingEmbedder` fallback when local model weights are unavailable offline.
- Added `CandidateChunkBuilder` producing structured chunks (`profile`, `skills`, `experience`, `education`) and `JobOfferTextBuilder` combining job title, location, seniority, work mode, department requirements, description, and responsibilities.
- Added `EmbeddingIndexService` (`index_candidate`, `index_job_offer`) and wired automatic indexing into `PersistenceService` (candidate analysis/updates) and `JobOffersService` (`create` and `update`).

---

## Verification

- Verified Alembic head continuity (`alembic heads` -> single head `e2a3b4c5d6f7`).
- Verified via unit/integration tests in `backend/tests/test_phase3_cv_and_matching.py`:
  - `test_embedding_service_and_pgvector_dialect_compilation` (384-d unit norm + PostgreSQL `<=>` compilation)
  - `test_job_offer_auto_indexing_and_candidate_chunks`
- Verified via `ruff check` and `pytest -v tests`.
