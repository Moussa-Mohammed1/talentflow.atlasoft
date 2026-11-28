from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.models.job_offers import JobOffers
from app.repositories.department_repository import DepartmentRepository
from app.schemas.evaluate import DepartmentEvaluation
from app.schemas.rag import (
    GroundedCandidateSummaryResponse,
    GroundedContextBundle,
    GroundedDraftRequest,
    GroundedDraftResponse,
    GroundedSummaryRequest,
)
from app.services.evaluation_service import EvaluationService
from app.services.llm_observability import observe_span
from app.services.rag.generator import GroundedRAGService
from app.services.rag.grounding import GroundingVerifier
from app.services.rag.retriever import GroundedContextRetriever


class RecruitmentToolset:
    """Controlled, bounded tool registry invoked by LangGraph workflow nodes."""

    def __init__(self, db: Session, *, recruiter_id: int | None = None) -> None:
        self.db = db
        self.recruiter_id = recruiter_id
        self.retriever = GroundedContextRetriever(db)
        self.rag_service = GroundedRAGService(db, retriever=self.retriever)

    def fetch_candidate_intake(self, candidate_id: int) -> dict[str, Any]:
        with observe_span(
            "tool.fetch_candidate_intake",
            as_type="tool",
            user_id=self.recruiter_id,
            input_data={"candidate_id": candidate_id},
        ) as span:
            cand = self.db.query(Candidat).filter(Candidat.id == candidate_id).first()
            if cand is None:
                out = {"exists": False, "candidate_id": candidate_id}
                span.set_output(out)
                return out
            out = {
                "exists": True,
                "candidate_id": cand.id,
                "fullname": cand.fullname,
                "email": cand.email,
                "current_role": cand.current_role,
                "location": cand.location,
                "total_experience_years": float(cand.total_experience_years or 0.0),
            }
            span.set_output(out)
            return out

    def fetch_job_offer_intake(self, job_offer_id: UUID | None) -> dict[str, Any]:
        with observe_span(
            "tool.fetch_job_offer_intake",
            as_type="tool",
            user_id=self.recruiter_id,
            input_data={"job_offer_id": str(job_offer_id) if job_offer_id else None},
        ) as span:
            if job_offer_id is None:
                out = {"provided": False, "exists": False}
                span.set_output(out)
                return out
            offer = self.db.query(JobOffers).filter(JobOffers.id == job_offer_id).first()
            if offer is None:
                out = {"provided": True, "exists": False, "job_offer_id": str(job_offer_id)}
                span.set_output(out)
                return out
            out = {
                "provided": True,
                "exists": True,
                "job_offer_id": str(offer.id),
                "title": offer.title,
                "department_id": offer.department_id,
                "location": offer.location,
                "required_experience_years": offer.required_experience_years,
            }
            span.set_output(out)
            return out

    def retrieve_grounded_context(
        self,
        *,
        candidate_id: int,
        job_offer_id: UUID | None = None,
        focus_query: str | None = None,
        top_k_chunks: int = 5,
    ) -> GroundedContextBundle:
        return self.retriever.retrieve(
            candidate_id=candidate_id,
            job_offer_id=job_offer_id,
            focus_query=focus_query,
            top_k_chunks=top_k_chunks,
            recruiter_id=self.recruiter_id,
        )

    def evaluate_candidate_departments(self, candidate_id: int) -> list[DepartmentEvaluation]:
        with observe_span(
            "tool.evaluate_candidate_departments",
            as_type="tool",
            user_id=self.recruiter_id,
            input_data={"candidate_id": candidate_id},
        ) as span:
            eval_svc = EvaluationService(self.db)
            response = eval_svc.evaluate(candidate_id)
            span.set_output({"departments_evaluated": len(response.evaluations)})
            return response.evaluations

    def generate_grounded_summary(
        self,
        *,
        bundle: GroundedContextBundle,
        job_offer_id: UUID | None = None,
    ) -> GroundedCandidateSummaryResponse:
        return self.rag_service.generate_candidate_summary(
            GroundedSummaryRequest(
                candidate_id=bundle.candidate_id,
                job_offer_id=job_offer_id,
            ),
            recruiter_id=self.recruiter_id,
            bundle=bundle,
        )

    def draft_grounded_email(
        self,
        *,
        bundle: GroundedContextBundle,
        request: GroundedDraftRequest,
    ) -> GroundedDraftResponse:
        return self.rag_service.draft_grounded_email(
            request,
            recruiter_id=self.recruiter_id,
            bundle=bundle,
        )

    def build_deterministic_summary_fallback(
        self,
        bundle: GroundedContextBundle,
    ) -> GroundedCandidateSummaryResponse:
        payload = GroundedRAGService._build_extractive_summary_fallback(bundle)
        check = GroundingVerifier.verify(
            bundle,
            claims=payload.get("citations", []),
            generated_text=payload["summary"],
        )
        return GroundedCandidateSummaryResponse(
            candidate_id=bundle.candidate_id,
            job_offer_id=bundle.job_offer_id,
            summary=payload["summary"],
            strengths=payload.get("strengths", []),
            risks_or_gaps=payload.get("risks_or_gaps", []),
            recommended_next_step=payload.get("recommended_next_step", "Review profile"),
            citations=check.citations,
            grounding_score=check.grounding_score,
            unsupported_claims=check.unsupported_claims,
            evidence_used=bundle.evidence,
            provider="extractive_fallback",
            model="deterministic-rag-v1",
            fallback_used=True,
            trace_id=bundle.trace_id,
        )

    def build_deterministic_draft_fallback(
        self,
        bundle: GroundedContextBundle,
        request: GroundedDraftRequest,
    ) -> GroundedDraftResponse:
        payload = GroundedRAGService._build_extractive_email_fallback(bundle, request)
        check = GroundingVerifier.verify(
            bundle,
            claims=payload.get("citations", []),
            generated_text=f"{payload['subject']}\n{payload['body']}",
        )
        return GroundedDraftResponse(
            candidate_id=bundle.candidate_id,
            job_offer_id=bundle.job_offer_id,
            draft_type=request.draft_type,
            subject=payload["subject"],
            body=payload["body"],
            citations=check.citations,
            grounding_score=check.grounding_score,
            unsupported_claims=check.unsupported_claims,
            evidence_used=bundle.evidence,
            provider="extractive_fallback",
            model="deterministic-rag-v1",
            fallback_used=True,
            trace_id=bundle.trace_id,
        )

    def resolve_department_id(self, department_name: str | None) -> int | None:
        if not department_name or not department_name.strip():
            return None
        dept = DepartmentRepository.get_by_name(self.db, department_name.strip())
        return dept.id if dept else None
