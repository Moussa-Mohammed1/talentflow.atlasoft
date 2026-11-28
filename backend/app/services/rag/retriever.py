from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.models.candidat_language import CandidatLanguages
from app.models.candidat_skill import CandidatSkills
from app.models.certification import Certification
from app.models.department import Department
from app.models.department_skill import DepartmentSkills
from app.models.education import Education
from app.models.embeddings import CandidateEmbedding, JobOfferEmbedding
from app.models.experience import Experience
from app.models.job_offers import JobOffers
from app.models.language import Language
from app.models.skills import Skills
from app.schemas.matching import ExplainableMatchSignals
from app.schemas.rag import GroundedContextBundle, GroundedEvidenceItem
from app.services.cv_pipeline.normalizer import CVAttributeNormalizer
from app.services.embeddings.chunker import JobOfferTextBuilder
from app.services.embeddings.embedder import EmbeddingService
from app.services.embeddings.indexer import EmbeddingIndexService
from app.services.llm_observability import observe_span
from app.services.matching.hybrid_matcher import HybridMatchingService, cosine_similarity


class GroundedContextRetriever:
    """Retrieves structured candidate/job attributes alongside top-k semantic chunks."""

    def __init__(
        self,
        db: Session,
        *,
        embedder: EmbeddingService | None = None,
        normalizer: CVAttributeNormalizer | None = None,
    ) -> None:
        self.db = db
        self.embedder = embedder or EmbeddingService()
        self.normalizer = normalizer or CVAttributeNormalizer()
        self.indexer = EmbeddingIndexService(embedder=self.embedder)

    def retrieve(
        self,
        *,
        candidate_id: int,
        job_offer_id: UUID | None = None,
        focus_query: str | None = None,
        top_k_chunks: int = 5,
        recruiter_id: int | None = None,
    ) -> GroundedContextBundle:
        with observe_span(
            "rag.retrieve_context",
            as_type="retriever",
            user_id=recruiter_id,
            input_data={
                "candidate_id": candidate_id,
                "job_offer_id": str(job_offer_id) if job_offer_id else None,
                "focus_query": focus_query,
                "top_k_chunks": top_k_chunks,
            },
            tags=["rag", "retriever"],
        ) as span:
            candidat = self.db.query(Candidat).filter(Candidat.id == candidate_id).first()
            if candidat is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Candidat introuvable",
                )

            skills = (
                self.db.query(Skills)
                .join(CandidatSkills, CandidatSkills.skill_id == Skills.id)
                .filter(CandidatSkills.candidat_id == candidate_id)
                .all()
            )
            experiences = (
                self.db.query(Experience)
                .filter(Experience.candidat_id == candidate_id)
                .all()
            )
            educations = (
                self.db.query(Education)
                .filter(Education.candidat_id == candidate_id)
                .all()
            )
            certifications = (
                self.db.query(Certification)
                .filter(Certification.candidat_id == candidate_id)
                .all()
            )
            languages = (
                self.db.query(Language)
                .join(CandidatLanguages, CandidatLanguages.language_id == Language.id)
                .filter(CandidatLanguages.candidat_id == candidate_id)
                .all()
            )

            norm_skills = [
                self.normalizer.normalize_skill_name(s.name)
                for s in skills
                if s.name and s.name.strip()
            ]
            # Deduplicate preserving order
            norm_skills = list(dict.fromkeys(s for s in norm_skills if s))

            norm_langs = [
                self.normalizer.normalize_language_name(lang.name)
                for lang in languages
                if lang.name and lang.name.strip()
            ]
            norm_langs = list(dict.fromkeys(lang for lang in norm_langs if lang))

            edu_labels = [
                " - ".join(
                    p.strip()
                    for p in (edu.degree, edu.field_of_study, edu.institution)
                    if p and p.strip()
                )
                for edu in educations
            ]
            edu_labels = [e for e in edu_labels if e]
            cert_labels = [c.name.strip() for c in certifications if c.name and c.name.strip()]

            evidence: list[GroundedEvidenceItem] = []

            profile_summary_parts = [f"Name: {candidat.fullname}"]
            if candidat.current_role:
                profile_summary_parts.append(f"Current Role: {candidat.current_role}")
            if candidat.location:
                profile_summary_parts.append(f"Location: {candidat.location}")
            cand_years = round(float(candidat.total_experience_years or 0.0), 2)
            profile_summary_parts.append(f"Total Experience: {cand_years:.1f} years")
            if candidat.summary:
                profile_summary_parts.append(f"Summary: {candidat.summary.strip()}")

            evidence.append(
                GroundedEvidenceItem(
                    source_id=f"cand:{candidate_id}:profile",
                    source_type="candidate_attribute",
                    label="Candidate structured profile",
                    excerpt=" | ".join(profile_summary_parts),
                )
            )

            if norm_skills:
                evidence.append(
                    GroundedEvidenceItem(
                        source_id=f"cand:{candidate_id}:skills",
                        source_type="candidate_attribute",
                        label="Verified candidate skills",
                        excerpt=", ".join(norm_skills),
                    )
                )

            if norm_langs:
                evidence.append(
                    GroundedEvidenceItem(
                        source_id=f"cand:{candidate_id}:languages",
                        source_type="candidate_attribute",
                        label="Candidate languages",
                        excerpt=", ".join(norm_langs),
                    )
                )

            if edu_labels or cert_labels:
                edu_parts = []
                if edu_labels:
                    edu_parts.append("Education: " + "; ".join(edu_labels))
                if cert_labels:
                    edu_parts.append("Certifications: " + ", ".join(cert_labels))
                evidence.append(
                    GroundedEvidenceItem(
                        source_id=f"cand:{candidate_id}:education",
                        source_type="candidate_attribute",
                        label="Education & Certifications",
                        excerpt=" | ".join(edu_parts),
                    )
                )

            for idx, exp in enumerate(experiences[:8]):
                title = (exp.title or "").strip()
                desc = (exp.description or "").strip()
                start_s = exp.start_date.strftime("%Y-%m") if exp.start_date else "?"
                end_s = exp.end_date.strftime("%Y-%m") if exp.end_date else "Present"
                text = f"{title} ({start_s} to {end_s})"
                if desc:
                    text += f": {desc[:280]}"
                evidence.append(
                    GroundedEvidenceItem(
                        source_id=f"cand:{candidate_id}:experience:{idx}",
                        source_type="candidate_attribute",
                        label=f"Experience #{idx + 1}",
                        excerpt=text,
                    )
                )

            # Ensure semantic chunks exist in DB (index on-demand if missing)
            chunks = (
                self.db.query(CandidateEmbedding)
                .filter(CandidateEmbedding.candidate_id == candidate_id)
                .all()
            )
            if not chunks:
                chunks = self.indexer.index_candidate(self.db, candidate_id)

            # Resolve optional job offer + match signals
            offer: JobOffers | None = None
            job_required_skills: list[str] = []
            job_required_years: float | None = None
            query_embedding: list[float] | None = None
            match_signals: ExplainableMatchSignals | None = None

            if job_offer_id is not None:
                offer = self.db.query(JobOffers).filter(JobOffers.id == job_offer_id).first()
                if offer is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Job offer not found",
                    )

                job_required_years = offer.required_experience_years
                if offer.department_id:
                    dept = (
                        self.db.query(Department)
                        .filter(Department.id == offer.department_id)
                        .first()
                    )
                    if dept and job_required_years is None:
                        job_required_years = float(dept.required_exp_years)
                    dept_skills = (
                        self.db.query(DepartmentSkills)
                        .filter(DepartmentSkills.departement_id == offer.department_id)
                        .all()
                    )
                    job_required_skills.extend(
                        self.normalizer.normalize_skill_name(ds.title)
                        for ds in dept_skills
                        if ds.title and ds.title.strip()
                    )

                offer_text = JobOfferTextBuilder.build_text(self.db, offer)
                if not job_required_skills:
                    job_required_skills = HybridMatchingService(
                        self.db, embedder=self.embedder, normalizer=self.normalizer
                    )._extract_skills_from_text(offer_text)

                job_required_skills = list(dict.fromkeys(s for s in job_required_skills if s))

                offer_emb = (
                    self.db.query(JobOfferEmbedding)
                    .filter(JobOfferEmbedding.job_offer_id == job_offer_id)
                    .first()
                )
                if offer_emb is None:
                    offer_emb = self.indexer.index_job_offer(self.db, job_offer_id)
                if offer_emb is not None and offer_emb.embedding:
                    query_embedding = list(offer_emb.embedding)

                evidence.append(
                    GroundedEvidenceItem(
                        source_id=f"job:{job_offer_id}:overview",
                        source_type="job_offer",
                        label=f"Job Offer: {offer.title}",
                        excerpt=offer_text[:600],
                    )
                )
                if job_required_skills or job_required_years is not None:
                    req_parts = []
                    if job_required_skills:
                        req_parts.append("Required Skills: " + ", ".join(job_required_skills))
                    if job_required_years is not None:
                        req_parts.append(f"Required Experience: {job_required_years:.1f} years")
                    evidence.append(
                        GroundedEvidenceItem(
                            source_id=f"job:{job_offer_id}:requirements",
                            source_type="department_requirement",
                            label="Structured Job Requirements",
                            excerpt=" | ".join(req_parts),
                        )
                    )

                matcher = HybridMatchingService(
                    self.db, embedder=self.embedder, normalizer=self.normalizer
                )
                match_signals = matcher._compute_explainable_signals(
                    candidat=candidat,
                    candidate_skills=norm_skills,
                    candidate_chunks=chunks,
                    query_embedding=query_embedding,
                    pg_min_distance=None,
                    required_skills=job_required_skills,
                    preferred_skills=[],
                    target_role=offer.title,
                    target_location=offer.location,
                    required_experience_years=job_required_years,
                    semantic_weight=0.55,
                    structured_weight=0.45,
                )
                evidence.append(
                    GroundedEvidenceItem(
                        source_id=f"match:{candidate_id}:{job_offer_id}:signals",
                        source_type="match_signal",
                        label="Hybrid Match Signals",
                        excerpt=(
                            f"hybrid_score={match_signals.hybrid_score:.1f}%, "
                            f"semantic_score={match_signals.semantic_score:.1f}%, "
                            f"structured_score={match_signals.structured_score:.1f}%, "
                            f"matched_skills={match_signals.matched_skills}, "
                            f"missing_skills={match_signals.missing_skills}, "
                            f"experience_gap_years={match_signals.experience_gap_years:.1f}"
                        ),
                    )
                )

            if focus_query and focus_query.strip():
                query_embedding, _ = self.embedder.embed_text(focus_query.strip())

            # Rank candidate semantic chunks
            scored_chunks: list[tuple[float | None, CandidateEmbedding]] = []
            for chunk in chunks:
                sim = (
                    round(cosine_similarity(query_embedding, list(chunk.embedding or [])), 4)
                    if query_embedding is not None and chunk.embedding
                    else None
                )
                scored_chunks.append((sim, chunk))

            if query_embedding is not None:
                scored_chunks.sort(key=lambda item: item[0] if item[0] is not None else -1.0, reverse=True)

            for sim, chunk in scored_chunks[:top_k_chunks]:
                evidence.append(
                    GroundedEvidenceItem(
                        source_id=f"cand:{candidate_id}:chunk:{chunk.chunk_type}:{chunk.chunk_index}",
                        source_type="candidate_chunk",
                        label=f"CV Chunk ({chunk.chunk_type}#{chunk.chunk_index})",
                        excerpt=chunk.chunk_text[:400],
                        similarity=sim,
                    )
                )

            bundle = GroundedContextBundle(
                candidate_id=candidate_id,
                candidate_name=candidat.fullname,
                candidate_email=candidat.email,
                candidate_role=candidat.current_role,
                candidate_location=candidat.location,
                candidate_experience_years=cand_years,
                candidate_skills=norm_skills,
                candidate_languages=norm_langs,
                candidate_educations=edu_labels,
                candidate_certifications=cert_labels,
                job_offer_id=offer.id if offer else None,
                job_title=offer.title if offer else None,
                job_location=offer.location if offer else None,
                job_required_skills=job_required_skills,
                job_required_experience_years=job_required_years,
                match_signals=match_signals,
                evidence=evidence,
                trace_id=span.trace_id,
            )
            span.set_output(
                {
                    "evidence_count": len(evidence),
                    "chunks_retrieved": min(len(scored_chunks), top_k_chunks),
                    "hybrid_score": match_signals.hybrid_score if match_signals else None,
                }
            )
            return bundle
