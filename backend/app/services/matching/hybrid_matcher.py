from __future__ import annotations

import math
from typing import Iterable
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import exists, func, select, text
from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.models.candidat_language import CandidatLanguages
from app.models.candidat_skill import CandidatSkills
from app.models.department import Department
from app.models.department_skill import DepartmentSkills
from app.models.embeddings import CandidateEmbedding, JobOfferEmbedding
from app.models.experience import Experience
from app.models.job_offers import JobOffers
from app.models.language import Language
from app.models.skills import Skills
from app.schemas.matching import (
    CandidateMatchResult,
    CandidateSearchFilters,
    ExplainableMatchSignals,
    HybridMatchRequest,
    HybridMatchResponse,
    MatchedChunkEvidence,
)
from app.services.cv_pipeline.normalizer import CVAttributeNormalizer
from app.services.embeddings.chunker import JobOfferTextBuilder
from app.services.embeddings.embedder import EmbeddingService
from app.services.embeddings.indexer import EmbeddingIndexService
from app.services.llm_observability import observe_span


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(-1.0, min(1.0, dot / (norm_a * norm_b)))


class HybridMatchingService:
    """Pairs PostgreSQL relational filtering with pgvector cosine similarity and explainable signals."""

    def __init__(
        self,
        db: Session,
        embedder: EmbeddingService | None = None,
        normalizer: CVAttributeNormalizer | None = None,
    ) -> None:
        self.db = db
        self.embedder = embedder or EmbeddingService()
        self.normalizer = normalizer or CVAttributeNormalizer()
        self.indexer = EmbeddingIndexService(embedder=self.embedder)

    def _apply_structured_filters(self, stmt, filters: CandidateSearchFilters):
        if filters.role and filters.role.strip():
            role_pattern = f"%{filters.role.strip()}%"
            exp_role_exists = exists(
                select(Experience.id).where(
                    Experience.candidat_id == Candidat.id,
                    Experience.title.ilike(role_pattern),
                )
            )
            stmt = stmt.where(
                Candidat.current_role.ilike(role_pattern) | exp_role_exists
            )

        if filters.location and filters.location.strip():
            loc_pattern = f"%{filters.location.strip()}%"
            stmt = stmt.where(Candidat.location.ilike(loc_pattern))

        if filters.min_experience_years is not None:
            stmt = stmt.where(
                func.coalesce(Candidat.total_experience_years, 0.0) >= filters.min_experience_years
            )

        if filters.max_experience_years is not None:
            stmt = stmt.where(
                func.coalesce(Candidat.total_experience_years, 0.0) <= filters.max_experience_years
            )

        if filters.is_talent_only:
            stmt = stmt.where(Candidat.is_talent.is_(True))

        if filters.skills:
            norm_skill_names = self._normalize_skill_list(filters.skills)
            if norm_skill_names:
                lower_names = [s.casefold() for s in norm_skill_names]
                if filters.match_all_skills:
                    for skill_lower in lower_names:
                        stmt = stmt.where(
                            exists(
                                select(CandidatSkills.id)
                                .join(Skills, Skills.id == CandidatSkills.skill_id)
                                .where(
                                    CandidatSkills.candidat_id == Candidat.id,
                                    func.lower(Skills.name) == skill_lower,
                                )
                            )
                        )
                else:
                    stmt = stmt.where(
                        exists(
                            select(CandidatSkills.id)
                            .join(Skills, Skills.id == CandidatSkills.skill_id)
                            .where(
                                CandidatSkills.candidat_id == Candidat.id,
                                func.lower(Skills.name).in_(lower_names),
                            )
                        )
                    )

        if filters.languages:
            norm_langs = [
                self.normalizer.normalize_language_name(lang).casefold()
                for lang in filters.languages
                if lang and lang.strip()
            ]
            if norm_langs:
                stmt = stmt.where(
                    exists(
                        select(CandidatLanguages.id)
                        .join(Language, Language.id == CandidatLanguages.language_id)
                        .where(
                            CandidatLanguages.candidat_id == Candidat.id,
                            func.lower(Language.name).in_(norm_langs),
                        )
                    )
                )

        return stmt

    def build_postgres_vector_query(
        self,
        *,
        filters: CandidateSearchFilters,
        query_embedding: list[float],
        limit: int = 20,
    ):
        """Construct the PostgreSQL pgvector cosine-distance + relational filter SQLAlchemy statement."""
        distance_expr = func.min(CandidateEmbedding.embedding.cosine_distance(query_embedding)).label(
            "min_distance"
        )
        stmt = (
            select(Candidat, distance_expr)
            .join(CandidateEmbedding, CandidateEmbedding.candidate_id == Candidat.id)
        )
        stmt = self._apply_structured_filters(stmt, filters)
        stmt = (
            stmt.group_by(Candidat.id)
            .order_by(distance_expr.asc())
            .limit(limit)
        )
        return stmt

    def _normalize_skill_list(self, skills: Iterable[str]) -> list[str]:
        seen: dict[str, str] = {}
        for raw in skills:
            cleaned = (raw or "").strip()
            if not cleaned:
                continue
            canonical = self.normalizer.normalize_skill_name(cleaned)
            key = canonical.casefold()
            if key and key not in seen:
                seen[key] = canonical
        return list(seen.values())

    def _extract_skills_from_text(self, text: str) -> list[str]:
        if not text or not text.strip():
            return []
        lowered = self.normalizer.ontology.normalize_key(text)
        found: list[str] = []
        seen: set[str] = set()
        for concept in self.normalizer.ontology.concepts:
            for alias in (concept.canonical, *concept.aliases):
                alias_key = self.normalizer.ontology.normalize_key(alias)
                if not alias_key or len(alias_key) < 2:
                    continue
                if f" {alias_key} " in f" {lowered} " and concept.canonical.casefold() not in seen:
                    seen.add(concept.canonical.casefold())
                    found.append(concept.canonical)
                    break
        return found

    def match_for_job_offer(
        self,
        job_offer_id: UUID,
        *,
        filters: CandidateSearchFilters | None = None,
        limit: int = 20,
        semantic_weight: float = 0.55,
        structured_weight: float = 0.45,
    ) -> HybridMatchResponse:
        offer = self.db.query(JobOffers).filter(JobOffers.id == job_offer_id).first()
        if offer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job offer not found",
            )

        required_skills: list[str] = []
        required_years = offer.required_experience_years
        if offer.department_id:
            dept = self.db.query(Department).filter(Department.id == offer.department_id).first()
            if dept and required_years is None:
                required_years = float(dept.required_exp_years)
            dept_skills = (
                self.db.query(DepartmentSkills)
                .filter(DepartmentSkills.departement_id == offer.department_id)
                .all()
            )
            required_skills.extend(ds.title for ds in dept_skills if ds.title)

        offer_text = JobOfferTextBuilder.build_text(self.db, offer)
        if not required_skills:
            required_skills = self._extract_skills_from_text(offer_text)

        offer_emb = (
            self.db.query(JobOfferEmbedding)
            .filter(JobOfferEmbedding.job_offer_id == job_offer_id)
            .first()
        )
        if offer_emb is None:
            offer_emb = self.indexer.index_job_offer(self.db, job_offer_id)

        request = HybridMatchRequest(
            job_offer_id=job_offer_id,
            query_text=offer_text,
            required_skills=required_skills,
            role=offer.title,
            location=offer.location,
            min_experience_years=required_years,
            filters=filters or CandidateSearchFilters(),
            limit=limit,
            semantic_weight=semantic_weight,
            structured_weight=structured_weight,
        )
        return self.match_candidates(
            request,
            precomputed_query_embedding=offer_emb.embedding if offer_emb else None,
        )

    def match_candidates(
        self,
        request: HybridMatchRequest,
        *,
        precomputed_query_embedding: list[float] | None = None,
    ) -> HybridMatchResponse:
        with observe_span(
            "matching.hybrid_search",
            as_type="retriever",
            input_data={
                "job_offer_id": str(request.job_offer_id) if request.job_offer_id else None,
                "role": request.role or request.filters.role,
                "required_skills": request.required_skills,
                "limit": request.limit,
            },
            tags=["matching", "pgvector"],
        ) as span:
            response = self._execute_match_candidates(
                request, precomputed_query_embedding=precomputed_query_embedding
            )
            span.set_output(
                {
                    "total_evaluated": response.total_candidates_evaluated,
                    "returned": len(response.results),
                    "top_score": response.results[0].signals.hybrid_score if response.results else None,
                }
            )
            return response

    def _execute_match_candidates(
        self,
        request: HybridMatchRequest,
        *,
        precomputed_query_embedding: list[float] | None = None,
    ) -> HybridMatchResponse:
        if request.job_offer_id is not None and precomputed_query_embedding is None and not request.query_text:
            return self.match_for_job_offer(
                request.job_offer_id,
                filters=request.filters,
                limit=request.limit,
                semantic_weight=request.semantic_weight,
                structured_weight=request.structured_weight,
            )

        target_role = request.role or request.filters.role
        target_location = request.location or request.filters.location
        target_min_years = (
            request.min_experience_years
            if request.min_experience_years is not None
            else request.filters.min_experience_years
        )
        required_skills = self._normalize_skill_list(
            request.required_skills or request.filters.skills
        )
        preferred_skills = self._normalize_skill_list(request.preferred_skills)

        query_text = (request.query_text or "").strip()
        if not query_text:
            query_parts = []
            if target_role:
                query_parts.append(f"Role: {target_role}")
            if target_location:
                query_parts.append(f"Location: {target_location}")
            if target_min_years is not None:
                query_parts.append(f"Minimum Experience: {target_min_years} years")
            if required_skills:
                query_parts.append("Required Skills: " + ", ".join(required_skills))
            if preferred_skills:
                query_parts.append("Preferred Skills: " + ", ".join(preferred_skills))
            query_text = "\n".join(query_parts)

        query_embedding: list[float] | None = precomputed_query_embedding
        model_name = self.embedder.active_model_name
        if query_embedding is None and query_text:
            query_embedding, model_name = self.embedder.embed_text(query_text)

        # Fetch candidate pool using relational SQL filters
        filtered_stmt = self._apply_structured_filters(select(Candidat), request.filters)
        candidates = list(self.db.execute(filtered_stmt).scalars().all())

        is_postgres = (
            self.db.bind is not None and getattr(self.db.bind.dialect, "name", "") == "postgresql"
        )
        use_pgvector_sql = is_postgres and self._postgres_has_vector_column()
        pg_distances: dict[int, float] = {}
        if use_pgvector_sql and query_embedding is not None and candidates:
            pg_stmt = self.build_postgres_vector_query(
                filters=request.filters,
                query_embedding=query_embedding,
                limit=max(request.limit * 3, 50),
            )
            for cand, dist in self.db.execute(pg_stmt).all():
                pg_distances[cand.id] = float(dist)

        total_evaluated = len(candidates)
        if not candidates:
            return HybridMatchResponse(
                query_summary={
                    "query_text": query_text,
                    "required_skills": required_skills,
                    "preferred_skills": preferred_skills,
                    "target_role": target_role,
                    "target_location": target_location,
                    "required_experience_years": target_min_years,
                    "embedding_model": model_name,
                    "dialect": "postgresql" if is_postgres else "sqlite",
                },
                total_candidates_evaluated=0,
                results=[],
            )

        candidate_ids = [c.id for c in candidates]
        skills_by_cand = self._load_candidate_skills_map(candidate_ids)
        chunks_by_cand = self._load_candidate_chunks_map(candidate_ids)

        # Ensure candidates without stored embeddings get indexed on demand
        for cand in candidates:
            if cand.id not in chunks_by_cand:
                indexed = self.indexer.index_candidate(self.db, cand.id)
                if indexed:
                    chunks_by_cand[cand.id] = indexed

        total_weight = request.semantic_weight + request.structured_weight
        sem_w = request.semantic_weight / total_weight if total_weight > 0 else 0.5
        str_w = request.structured_weight / total_weight if total_weight > 0 else 0.5

        scored_results: list[CandidateMatchResult] = []
        for cand in candidates:
            cand_skills = skills_by_cand.get(cand.id, [])
            cand_chunks = chunks_by_cand.get(cand.id, [])
            signals = self._compute_explainable_signals(
                candidat=cand,
                candidate_skills=cand_skills,
                candidate_chunks=cand_chunks,
                query_embedding=query_embedding,
                pg_min_distance=pg_distances.get(cand.id),
                required_skills=required_skills,
                preferred_skills=preferred_skills,
                target_role=target_role,
                target_location=target_location,
                required_experience_years=target_min_years,
                semantic_weight=sem_w,
                structured_weight=str_w,
            )
            scored_results.append(
                CandidateMatchResult(
                    candidate_id=cand.id,
                    resume_id=cand.resume_id,
                    fullname=cand.fullname,
                    email=cand.email,
                    current_role=cand.current_role,
                    location=cand.location,
                    total_experience_years=round(float(cand.total_experience_years or 0.0), 2),
                    photo=cand.photo,
                    is_talent=bool(cand.is_talent),
                    signals=signals,
                )
            )

        scored_results.sort(
            key=lambda item: (
                item.signals.hybrid_score,
                item.signals.semantic_similarity,
                item.signals.skill_coverage,
            ),
            reverse=True,
        )

        return HybridMatchResponse(
            query_summary={
                "query_text": query_text,
                "required_skills": required_skills,
                "preferred_skills": preferred_skills,
                "target_role": target_role,
                "target_location": target_location,
                "required_experience_years": target_min_years,
                "embedding_model": model_name,
                "dialect": "postgresql" if is_postgres else "sqlite",
            },
            total_candidates_evaluated=total_evaluated,
            results=scored_results[: request.limit],
        )

    def _postgres_has_vector_column(self) -> bool:
        try:
            row = self.db.execute(
                text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = 'candidate_embeddings' "
                    "AND column_name = 'embedding' "
                    "AND udt_name = 'vector'"
                )
            ).first()
            return row is not None
        except Exception:
            return False

    def _load_candidate_skills_map(self, candidate_ids: list[int]) -> dict[int, list[str]]:
        rows = (
            self.db.query(CandidatSkills.candidat_id, Skills.name)
            .join(Skills, Skills.id == CandidatSkills.skill_id)
            .filter(CandidatSkills.candidat_id.in_(candidate_ids))
            .all()
        )
        mapping: dict[int, list[str]] = {}
        for cid, skill_name in rows:
            if skill_name:
                mapping.setdefault(cid, []).append(
                    self.normalizer.normalize_skill_name(skill_name)
                )
        return mapping

    def _load_candidate_chunks_map(self, candidate_ids: list[int]) -> dict[int, list[CandidateEmbedding]]:
        rows = (
            self.db.query(CandidateEmbedding)
            .filter(CandidateEmbedding.candidate_id.in_(candidate_ids))
            .all()
        )
        mapping: dict[int, list[CandidateEmbedding]] = {}
        for row in rows:
            mapping.setdefault(row.candidate_id, []).append(row)
        return mapping

    def _compute_explainable_signals(
        self,
        *,
        candidat: Candidat,
        candidate_skills: list[str],
        candidate_chunks: list[CandidateEmbedding],
        query_embedding: list[float] | None,
        pg_min_distance: float | None,
        required_skills: list[str],
        preferred_skills: list[str],
        target_role: str | None,
        target_location: str | None,
        required_experience_years: float | None,
        semantic_weight: float,
        structured_weight: float,
    ) -> ExplainableMatchSignals:
        # 1. Semantic similarity + top matching chunk evidences
        chunk_evidences: list[MatchedChunkEvidence] = []
        if query_embedding is not None and candidate_chunks:
            for chunk in candidate_chunks:
                sim = cosine_similarity(query_embedding, list(chunk.embedding or []))
                chunk_evidences.append(
                    MatchedChunkEvidence(
                        chunk_type=chunk.chunk_type,
                        chunk_index=chunk.chunk_index,
                        similarity=round(sim, 4),
                        excerpt=chunk.chunk_text[:240],
                    )
                )
            chunk_evidences.sort(key=lambda c: c.similarity, reverse=True)

        if pg_min_distance is not None:
            best_sim = max(0.0, min(1.0, 1.0 - pg_min_distance))
        elif chunk_evidences:
            best_sim = max(0.0, chunk_evidences[0].similarity)
        else:
            best_sim = 0.0

        semantic_score = round(best_sim * 100.0, 2)

        # 2. Skill overlap & gap signals (normalized)
        cand_skill_map = {s.casefold(): s for s in candidate_skills}
        req_map = {s.casefold(): s for s in required_skills}
        pref_map = {s.casefold(): s for s in preferred_skills}

        matched_skills = [req_map[k] for k in req_map if k in cand_skill_map]
        missing_skills = [req_map[k] for k in req_map if k not in cand_skill_map]
        preferred_matched = [pref_map[k] for k in pref_map if k in cand_skill_map]
        extra_skills = [
            cand_skill_map[k]
            for k in cand_skill_map
            if k not in req_map and k not in pref_map
        ]

        skill_coverage = (
            round(len(matched_skills) / len(required_skills), 4)
            if required_skills
            else 1.0
        )

        # 3. Experience, Role & Location signals
        cand_years = round(float(candidat.total_experience_years or 0.0), 2)
        exp_gap = 0.0
        exp_score = 100.0
        if required_experience_years is not None and required_experience_years > 0:
            exp_gap = round(max(0.0, required_experience_years - cand_years), 2)
            exp_score = min(cand_years / required_experience_years, 1.0) * 100.0

        role_match: bool | None = None
        if target_role and target_role.strip():
            cand_role_norm = (candidat.current_role or "").casefold()
            target_role_norm = target_role.strip().casefold()
            role_match = (
                target_role_norm in cand_role_norm
                or cand_role_norm in target_role_norm
                if cand_role_norm
                else False
            )

        location_match: bool | None = None
        if target_location and target_location.strip():
            cand_loc_norm = (candidat.location or "").casefold()
            target_loc_norm = target_location.strip().casefold()
            location_match = (
                target_loc_norm in cand_loc_norm or cand_loc_norm in target_loc_norm
                if cand_loc_norm
                else False
            )

        # 4. Structured score composition
        components: list[tuple[float, float]] = []
        if required_skills:
            components.append((skill_coverage * 100.0, 0.55))
        if preferred_skills:
            pref_cov = len(preferred_matched) / len(preferred_skills)
            components.append((pref_cov * 100.0, 0.10))
        if required_experience_years is not None:
            components.append((exp_score, 0.25))
        if role_match is not None:
            components.append((100.0 if role_match else 0.0, 0.15))
        if location_match is not None:
            components.append((100.0 if location_match else 0.0, 0.10))

        if components:
            w_sum = sum(w for _, w in components)
            structured_score = round(sum(val * w for val, w in components) / w_sum, 2)
        else:
            structured_score = semantic_score

        hybrid_score = round(
            (semantic_score * semantic_weight) + (structured_score * structured_weight),
            2,
        )

        # 5. Human-readable highlights and gaps
        highlights: list[str] = []
        gaps: list[str] = []

        if best_sim >= 0.7:
            highlights.append(f"Strong semantic alignment ({semantic_score:.1f}%)")
        elif best_sim >= 0.4:
            highlights.append(f"Moderate semantic alignment ({semantic_score:.1f}%)")

        if matched_skills:
            highlights.append(
                f"Matched {len(matched_skills)}/{len(required_skills)} required skills: "
                + ", ".join(matched_skills[:6])
            )
        if preferred_matched:
            highlights.append("Preferred skills present: " + ", ".join(preferred_matched[:5]))
        if role_match is True and candidat.current_role:
            highlights.append(f"Role match: {candidat.current_role}")
        if location_match is True and candidat.location:
            highlights.append(f"Location match: {candidat.location}")

        for missing in missing_skills:
            gaps.append(f"Missing required skill: {missing}")
        if exp_gap > 0:
            gaps.append(
                f"Experience gap: {cand_years:.1f} yrs vs {required_experience_years:.1f} yrs required"
            )
        if role_match is False:
            gaps.append(
                f"Role mismatch: candidate '{candidat.current_role or 'unspecified'}' vs '{target_role}'"
            )
        if location_match is False:
            gaps.append(
                f"Location mismatch: candidate '{candidat.location or 'unspecified'}' vs '{target_location}'"
            )

        return ExplainableMatchSignals(
            semantic_similarity=round(best_sim, 4),
            semantic_score=semantic_score,
            structured_score=structured_score,
            hybrid_score=hybrid_score,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            preferred_matched_skills=preferred_matched,
            extra_skills=extra_skills[:15],
            skill_coverage=skill_coverage,
            candidate_experience_years=cand_years,
            required_experience_years=required_experience_years,
            experience_gap_years=exp_gap,
            role_match=role_match,
            location_match=location_match,
            matched_chunks=chunk_evidences[:3],
            highlights=highlights,
            gaps=gaps,
        )
