# Phase 3 — Milestone 3: Hybrid Semantic Matching & Explainability API

## Summary

Milestone 3 pairs PostgreSQL `pgvector` cosine similarity search with structured relational filters (`role`, `experience`, `skills`, `location`, `languages`, `is_talent_only`) and exposes transparent, explainable matching signals (matched skills, missing skills, skill coverage, experience gaps, per-chunk semantic evidence, highlights, and gaps) via dedicated REST endpoints.

---

## Implemented Changes

### 1. Hybrid Matching Schemas & Explainable Signals
**Files**:
- `backend/app/schemas/matching.py`

- Added `CandidateSearchFilters` supporting:
  - `role`, `location`, `min_experience_years`, `max_experience_years`, `skills`, `match_all_skills`, `languages`, and `is_talent_only`.
- Added `HybridMatchRequest` supporting matching either against a `job_offer_id` or free-text `query_text` + explicit `required_skills` / `preferred_skills`, configurable `semantic_weight` / `structured_weight`, and `limit`.
- Added `ExplainableMatchSignals` & `MatchedChunkEvidence` returning:
  - `semantic_similarity` (0–1), `semantic_score` (0–100), `structured_score` (0–100), and `hybrid_score` (0–100)
  - `matched_skills`, `missing_skills`, `preferred_matched_skills`, `extra_skills`, and `skill_coverage`
  - `candidate_experience_years`, `required_experience_years`, and `experience_gap_years`
  - `role_match` and `location_match`
  - `matched_chunks` (top CV chunks ranked by cosine similarity with text excerpts)
  - `highlights` and `gaps` human-readable explanations

### 2. PostgreSQL Hybrid Matcher Engine
**Files**:
- `backend/app/services/matching/hybrid_matcher.py`
- `backend/app/services/matching/__init__.py`

- Implemented `HybridMatchingService`:
  - Applies relational SQLAlchemy filters (`current_role` / `Experience.title` `ILIKE`, `location` `ILIKE`, `total_experience_years` bounds, normalized `CandidatSkills` / `Skills` `EXISTS` subqueries with `ANY`/`ALL` semantics, `CandidatLanguages`, `is_talent`).
  - On PostgreSQL, executes `build_postgres_vector_query()` using `CandidateEmbedding.embedding.cosine_distance(query_embedding)` (`<=>`) alongside relational filters (`GROUP BY candidats.id ORDER BY min_distance ASC`).
  - On SQLite test runs, executes the same relational filters and evaluates cosine similarity across stored candidate chunks.
  - Normalizes both query/job-offer skills and candidate skills via `CVAttributeNormalizer` so skill aliases (`postgres` ↔ `PostgreSQL`, `k8s` ↔ `Kubernetes`) resolve accurately without false gaps.
  - Computes transparent `structured_score`, `semantic_score`, `hybrid_score`, chunk evidence, `highlights`, and `gaps`.

### 3. Authenticated Matching & Reindexing API Routes
**Files**:
- `backend/app/api/routes/matching.py`
- `backend/app/api/router.py`

- `POST /api/matching/candidates`: Hybrid candidate search by query text, job offer, and/or structured filters.
- `GET /api/matching/job-offers/{job_offer_id}/candidates`: Match and rank candidates for an existing job offer with optional query parameter filters (`role`, `location`, `min_experience_years`, `skills`, `match_all_skills`, `is_talent_only`, `limit`).
- `POST /api/matching/reindex/candidate/{candidate_id}`: Recompute and persist candidate profile/section embeddings.
- `POST /api/matching/reindex/job-offer/{job_offer_id}`: Recompute and persist job offer embedding.

---

## Verification

- Added comprehensive tests in `backend/tests/test_phase3_cv_and_matching.py`:
  - `test_hybrid_matching_filtering_ranking_and_explainable_signals`
  - `test_embedding_service_and_pgvector_dialect_compilation`
- Verified via `ruff check` on all hardened & Phase 3 modules and `pytest -v tests`.
