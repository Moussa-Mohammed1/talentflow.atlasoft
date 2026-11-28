# Phase 3 — Milestone 1: Modular CV Extraction, spaCy NER & Attribute Normalization

## Summary

Milestone 1 upgrades CV ingestion from a single-file text extractor into a modular, validated pipeline that cleanly separates document parsing (`PyMuPDF`, `pdfplumber`, `python-docx`), applies `spaCy` NER + `EntityRuler` enrichment, validates extracted records through structured Pydantic v2 models, and normalizes skills and candidate attributes before database persistence.

---

## Implemented Changes

### 1. Clean Modular Document Parsers & Text Normalization
**Files**:
- `backend/app/services/resume_extraction/models.py`
- `backend/app/services/resume_extraction/cleaner.py`
- `backend/app/services/resume_extraction/parsers/base.py`
- `backend/app/services/resume_extraction/parsers/pdf_parser.py`
- `backend/app/services/resume_extraction/parsers/docx_parser.py`
- `backend/app/services/resume_extraction/parsers/__init__.py`
- `backend/app/services/resume_extraction/extractor.py`
- `backend/app/services/resume_extraction/__init__.py`

- Added `ParsedDocument` Pydantic model capturing `file_path`, `file_type`, `parser_used`, `raw_text`, `cleaned_text`, `pages`, `page_count`, and parser `metadata`.
- Added `TextCleaner` to apply Unicode `NFKC` normalization, strip zero-width/control characters, collapse horizontal whitespace, and normalize blank lines while preserving line breaks needed by section and block extractors (fixing the previous `_clean_text` bug that returned uncleaned `text.strip()`).
- Separated `PyMuPDFParser`, `PdfPlumberParser`, `PDFParser` (PyMuPDF primary with automatic `pdfplumber` fallback below `MIN_TEXT_THRESHOLD = 50` chars), and `DocxParser` (`python-docx` paragraphs + table rows) behind `BaseDocumentParser`.
- Kept `TextExtractionService.extract(file_path)` and `UnsupportedFileTypeError` backward-compatible while exposing `extract_document(file_path) -> ParsedDocument`.

### 2. spaCy NER & Structured Pydantic Schemas
**Files**:
- `backend/app/schemas/cv_pipeline.py`
- `backend/app/services/cv_pipeline/spacy_ner.py`
- `backend/app/services/cv_pipeline/normalizer.py`
- `backend/app/services/cv_pipeline/pipeline.py`
- `backend/app/services/cv_pipeline/__init__.py`

- Added Pydantic v2 structured models in `backend/app/schemas/cv_pipeline.py`:
  - `NEREntityRead`, `NERExtractionSummary`
  - `NormalizedSkillSchema`, `NormalizedExperienceSchema`, `NormalizedEducationSchema`, `NormalizedCertificationSchema`, `NormalizedLanguageSchema`
  - `CandidateIdentityAttributesSchema` (`fullname`, `email`, `phone`, `current_role`, `location`, `summary`, `total_experience_years`)
  - `StructuredCVProfile`
- Added `SpacyNERExtractor`: loads `fr_core_news_sm`, `en_core_web_sm`, or `xx_ent_wiki_sm` (falling back gracefully to `spacy.blank("xx")`) and attaches a bilingual `EntityRuler` + header pattern extractors for `PERSON`, `ORG`, `LOC`/`GPE`, and `ROLE` entities.
- Added `CVAttributeNormalizer`:
  - Canonicalizes skills via `SkillOntology` (e.g., `postgres` → `PostgreSQL`, `vuejs` → `Vue.js`, `k8s` → `Kubernetes`) and deduplicates by normalized key while retaining highest confidence and merged sources.
  - Normalizes phone numbers, locations, role headlines, education degrees (`Ingénieur d'Etat` → `Master`, `Licence` → `Bachelor`), and language names (`français` → `French`, `anglais` → `English`).
  - Computes non-overlapping `total_experience_years` by merging overlapping date intervals.
- Added `StructuredCVPipeline` orchestrating document parsing, NER, sectioned extraction, normalization, and `StructuredCVProfile` construction.

### 3. Candidate Schema Extension & Pre-Persistence Normalization
**Files**:
- `backend/app/models/candidat.py`
- `backend/app/models/job_offers.py`
- `backend/app/schemas/resume.py`
- `backend/app/schemas/job_offers.py`
- `backend/app/schemas/skill_extraction.py`
- `backend/app/repositories/skill_repository.py`
- `backend/app/repositories/language_repository.py`
- `backend/app/services/resume/persistence_service.py`
- `backend/app/services/resume/analysis_workflow.py`
- `backend/app/services/resume/identity_service.py`
- `backend/app/services/resume/update_service.py`
- `backend/app/services/resume_service.py`
- `backend/app/workers/tasks.py`
- `backend/alembic/versions/d1f2a3b4c5e6_add_structured_profile_fields_to_candidats_and_job_offers.py`

- Added `current_role`, `location`, `total_experience_years`, and `summary` to `Candidat` (plus `location` and `required_experience_years` on `JobOffers`) with Alembic migration `d1f2a3b4c5e6`.
- Updated `SkillRepository` and `LanguageRepository` to normalize and deduplicate names case-insensitively before inserting or linking rows.
- Updated `PersistenceService`, `ResumeAnalysisWorkflow`, `ResumeIdentityService`, and Celery `execute_resume_analysis_job` to run normalization and persist structured candidate attributes.

---

## Verification

- Verified via unit/integration tests in `backend/tests/test_phase3_cv_and_matching.py`:
  - `test_text_cleaner_and_modular_pdf_docx_parsers`
  - `test_spacy_ner_and_attribute_normalization_and_persistence`
- Verified via `ruff check` and `pytest -v tests`.
