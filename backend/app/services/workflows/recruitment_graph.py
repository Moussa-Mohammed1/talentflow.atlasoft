from __future__ import annotations

import time
from typing import Any, Literal, TypedDict
from uuid import UUID

from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from app.schemas.evaluate import DepartmentEvaluation
from app.schemas.rag import (
    GroundedCandidateSummaryResponse,
    GroundedContextBundle,
    GroundedDraftRequest,
    GroundedDraftResponse,
)
from app.schemas.workflows import (
    CandidateRecruitmentWorkflowRequest,
    CandidateRecruitmentWorkflowResponse,
    WorkflowStepTrace,
)
from app.services.llm_observability import observe_span, record_langfuse_score
from app.services.rag.grounding import GroundingVerifier
from app.services.workflows.tools import RecruitmentToolset


class RecruitmentWorkflowState(TypedDict, total=False):
    candidate_id: int
    job_offer_id: UUID | None
    department_id: int | None
    draft_language: str
    company_name: str
    recruiter_name: str
    interview_date: str | None
    interview_time: str | None
    duration_minutes: int
    location: str | None
    include_email_draft: bool
    min_compatibility_for_interview: float

    # Runtime state populated by nodes
    trace_id: str | None
    intake_valid: bool
    error_message: str | None
    bundle: GroundedContextBundle | None
    department_evaluations: list[DepartmentEvaluation]
    overall_score: float
    decision: Literal["proceed_to_interview", "hold_or_reject", "error"]
    grounded_summary: GroundedCandidateSummaryResponse | None
    draft_email: GroundedDraftResponse | None
    validation_passed: bool
    validation_warnings: list[str]
    repair_attempts: int
    fallback_used: bool
    step_history: list[WorkflowStepTrace]


class RecruitmentWorkflowRunner:
    """Explicit LangGraph state machine for recruitment intake -> retrieval -> evaluation -> drafting -> validation."""

    def __init__(self, db: Session, *, recruiter_id: int | None = None) -> None:
        self.db = db
        self.recruiter_id = recruiter_id
        self.tools = RecruitmentToolset(db, recruiter_id=recruiter_id)
        self.graph = self._compile_graph()

    def _compile_graph(self):
        builder = StateGraph(RecruitmentWorkflowState)

        builder.add_node("intake_validate", self._node_intake_validate)
        builder.add_node("retrieve_context", self._node_retrieve_context)
        builder.add_node("structured_evaluate", self._node_structured_evaluate)
        builder.add_node("generate_and_draft", self._node_generate_and_draft)
        builder.add_node("generate_summary_only", self._node_generate_summary_only)
        builder.add_node("validate_outputs", self._node_validate_outputs)
        builder.add_node("repair_or_fallback", self._node_repair_or_fallback)

        builder.add_edge(START, "intake_validate")
        builder.add_conditional_edges(
            "intake_validate",
            self._route_after_intake,
            {
                "valid": "retrieve_context",
                "invalid": END,
            },
        )
        builder.add_edge("retrieve_context", "structured_evaluate")
        builder.add_conditional_edges(
            "structured_evaluate",
            self._route_after_evaluation,
            {
                "draft": "generate_and_draft",
                "summary_only": "generate_summary_only",
            },
        )
        builder.add_edge("generate_and_draft", "validate_outputs")
        builder.add_edge("generate_summary_only", "validate_outputs")
        builder.add_conditional_edges(
            "validate_outputs",
            self._route_after_validation,
            {
                "pass": END,
                "repair": "repair_or_fallback",
                "end": END,
            },
        )
        builder.add_edge("repair_or_fallback", "validate_outputs")

        return builder.compile()

    def get_mermaid_diagram(self) -> str:
        return self.graph.get_graph().draw_mermaid()

    def get_node_names(self) -> list[str]:
        return [
            "intake_validate",
            "retrieve_context",
            "structured_evaluate",
            "generate_and_draft",
            "generate_summary_only",
            "validate_outputs",
            "repair_or_fallback",
        ]

    # ------------------------------------------------------------------
    # Graph Nodes
    # ------------------------------------------------------------------
    def _node_intake_validate(self, state: RecruitmentWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        with observe_span(
            "workflow.node.intake_validate",
            as_type="span",
            user_id=self.recruiter_id,
            input_data={"candidate_id": state["candidate_id"], "job_offer_id": str(state.get("job_offer_id"))},
        ) as span:
            cand_info = self.tools.fetch_candidate_intake(state["candidate_id"])
            if not cand_info.get("exists"):
                msg = f"Candidate #{state['candidate_id']} not found."
                history.append(
                    WorkflowStepTrace(
                        node="intake_validate",
                        status="failed",
                        duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                        details={"reason": msg},
                    )
                )
                span.set_error(msg)
                return {
                    "intake_valid": False,
                    "error_message": msg,
                    "decision": "error",
                    "step_history": history,
                }

            offer_info = self.tools.fetch_job_offer_intake(state.get("job_offer_id"))
            if offer_info.get("provided") and not offer_info.get("exists"):
                msg = f"Job offer {state.get('job_offer_id')} not found."
                history.append(
                    WorkflowStepTrace(
                        node="intake_validate",
                        status="failed",
                        duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                        details={"reason": msg},
                    )
                )
                span.set_error(msg)
                return {
                    "intake_valid": False,
                    "error_message": msg,
                    "decision": "error",
                    "step_history": history,
                }

            history.append(
                WorkflowStepTrace(
                    node="intake_validate",
                    status="completed",
                    duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                    details={"candidate": cand_info.get("fullname"), "job_offer": offer_info.get("title")},
                )
            )
            span.set_output({"intake_valid": True})
            return {
                "intake_valid": True,
                "error_message": None,
                "step_history": history,
            }

    def _node_retrieve_context(self, state: RecruitmentWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        with observe_span(
            "workflow.node.retrieve_context",
            as_type="retriever",
            user_id=self.recruiter_id,
        ) as span:
            bundle = self.tools.retrieve_grounded_context(
                candidate_id=state["candidate_id"],
                job_offer_id=state.get("job_offer_id"),
            )
            history.append(
                WorkflowStepTrace(
                    node="retrieve_context",
                    status="completed",
                    duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                    details={
                        "evidence_count": len(bundle.evidence),
                        "skills_count": len(bundle.candidate_skills),
                    },
                )
            )
            span.set_output({"evidence_count": len(bundle.evidence)})
            return {"bundle": bundle, "step_history": history}

    def _node_structured_evaluate(self, state: RecruitmentWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        bundle = state["bundle"]
        with observe_span(
            "workflow.node.structured_evaluate",
            as_type="span",
            user_id=self.recruiter_id,
        ) as span:
            evals: list[DepartmentEvaluation] = self.tools.evaluate_candidate_departments(state["candidate_id"])
            overall_score = 0.0
            if bundle and bundle.match_signals is not None:
                overall_score = float(bundle.match_signals.hybrid_score)
            elif state.get("department_id") is not None:
                matched_dept = [e for e in evals if e.department_id == state["department_id"]]
                overall_score = float(matched_dept[0].compatibility) if matched_dept else (
                    float(evals[0].compatibility) if evals else 0.0
                )
            elif evals:
                overall_score = float(evals[0].compatibility)

            threshold = float(state.get("min_compatibility_for_interview", 50.0))
            decision: Literal["proceed_to_interview", "hold_or_reject"] = (
                "proceed_to_interview" if overall_score >= threshold else "hold_or_reject"
            )

            history.append(
                WorkflowStepTrace(
                    node="structured_evaluate",
                    status="completed",
                    duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                    details={
                        "overall_score": round(overall_score, 2),
                        "threshold": threshold,
                        "decision": decision,
                        "departments_evaluated": len(evals),
                    },
                )
            )
            span.set_output({"overall_score": overall_score, "decision": decision})
            return {
                "department_evaluations": evals,
                "overall_score": round(overall_score, 2),
                "decision": decision,
                "step_history": history,
            }

    def _node_generate_and_draft(self, state: RecruitmentWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        bundle = state["bundle"]
        assert bundle is not None
        with observe_span(
            "workflow.node.generate_and_draft",
            as_type="chain",
            user_id=self.recruiter_id,
        ) as span:
            summary = self.tools.generate_grounded_summary(
                bundle=bundle,
                job_offer_id=state.get("job_offer_id"),
            )
            draft_req = GroundedDraftRequest(
                candidate_id=state["candidate_id"],
                job_offer_id=state.get("job_offer_id"),
                draft_type="interview_invitation",
                interview_date=state.get("interview_date"),
                interview_time=state.get("interview_time"),
                duration_minutes=int(state.get("duration_minutes", 60)),
                location=state.get("location"),
                recruiter_name=state.get("recruiter_name", ""),
                company_name=state.get("company_name", "TalentFlow"),
                language=state.get("draft_language", "french"),
            )
            draft = self.tools.draft_grounded_email(bundle=bundle, request=draft_req)
            fallback_used = bool(state.get("fallback_used") or summary.fallback_used or draft.fallback_used)

            history.append(
                WorkflowStepTrace(
                    node="generate_and_draft",
                    status="fallback" if fallback_used else "completed",
                    duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                    details={
                        "summary_provider": summary.provider,
                        "draft_provider": draft.provider,
                    },
                )
            )
            span.set_output({"summary_provider": summary.provider, "draft_provider": draft.provider})
            return {
                "grounded_summary": summary,
                "draft_email": draft,
                "fallback_used": fallback_used,
                "step_history": history,
            }

    def _node_generate_summary_only(self, state: RecruitmentWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        bundle = state["bundle"]
        assert bundle is not None
        with observe_span(
            "workflow.node.generate_summary_only",
            as_type="chain",
            user_id=self.recruiter_id,
        ) as span:
            summary = self.tools.generate_grounded_summary(
                bundle=bundle,
                job_offer_id=state.get("job_offer_id"),
            )
            fallback_used = bool(state.get("fallback_used") or summary.fallback_used)
            history.append(
                WorkflowStepTrace(
                    node="generate_summary_only",
                    status="fallback" if summary.fallback_used else "completed",
                    duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                    details={
                        "reason": "score_below_threshold_or_draft_disabled",
                        "summary_provider": summary.provider,
                    },
                )
            )
            span.set_output({"summary_provider": summary.provider})
            return {
                "grounded_summary": summary,
                "draft_email": None,
                "fallback_used": fallback_used,
                "step_history": history,
            }

    def _node_validate_outputs(self, state: RecruitmentWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        bundle = state.get("bundle")
        summary = state.get("grounded_summary")
        draft = state.get("draft_email")
        warnings: list[str] = []

        with observe_span(
            "workflow.node.validate_outputs",
            as_type="guardrail",
            user_id=self.recruiter_id,
        ) as span:
            passed = True
            if bundle is None or summary is None:
                passed = False
                warnings.append("Missing grounded summary or context bundle.")
            else:
                sum_check = GroundingVerifier.verify(
                    bundle,
                    claims=[c.model_dump() for c in summary.citations],
                    generated_text=" ".join([summary.summary, *summary.strengths, *summary.risks_or_gaps]),
                )
                if not sum_check.passed:
                    passed = False
                    warnings.extend(sum_check.unsupported_claims)

            if draft is not None and bundle is not None:
                draft_check = GroundingVerifier.verify(
                    bundle,
                    claims=[c.model_dump() for c in draft.citations],
                    generated_text=f"{draft.subject}\n{draft.body}",
                )
                if not draft_check.passed:
                    passed = False
                    warnings.extend(draft_check.unsupported_claims)

            history.append(
                WorkflowStepTrace(
                    node="validate_outputs",
                    status="completed" if passed else "failed",
                    duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                    details={"validation_passed": passed, "warnings_count": len(warnings)},
                )
            )
            span.set_output({"validation_passed": passed, "warnings": warnings})
            return {
                "validation_passed": passed,
                "validation_warnings": warnings,
                "step_history": history,
            }

    def _node_repair_or_fallback(self, state: RecruitmentWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        bundle = state["bundle"]
        assert bundle is not None
        attempts = int(state.get("repair_attempts", 0)) + 1

        with observe_span(
            "workflow.node.repair_or_fallback",
            as_type="span",
            user_id=self.recruiter_id,
        ) as span:
            summary = self.tools.build_deterministic_summary_fallback(bundle)
            draft = None
            if state.get("draft_email") is not None:
                draft_req = GroundedDraftRequest(
                    candidate_id=state["candidate_id"],
                    job_offer_id=state.get("job_offer_id"),
                    draft_type="interview_invitation",
                    interview_date=state.get("interview_date"),
                    interview_time=state.get("interview_time"),
                    duration_minutes=int(state.get("duration_minutes", 60)),
                    location=state.get("location"),
                    recruiter_name=state.get("recruiter_name", ""),
                    company_name=state.get("company_name", "TalentFlow"),
                    language=state.get("draft_language", "french"),
                )
                draft = self.tools.build_deterministic_draft_fallback(bundle, draft_req)

            history.append(
                WorkflowStepTrace(
                    node="repair_or_fallback",
                    status="fallback",
                    duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                    details={"attempt": attempts, "strategy": "deterministic_grounded_fallback"},
                )
            )
            span.set_output({"attempt": attempts})
            return {
                "grounded_summary": summary,
                "draft_email": draft,
                "repair_attempts": attempts,
                "fallback_used": True,
                "step_history": history,
            }

    # ------------------------------------------------------------------
    # Conditional Edge Routers
    # ------------------------------------------------------------------
    @staticmethod
    def _route_after_intake(state: RecruitmentWorkflowState) -> str:
        return "valid" if state.get("intake_valid") else "invalid"

    @staticmethod
    def _route_after_evaluation(state: RecruitmentWorkflowState) -> str:
        if state.get("include_email_draft", True) and state.get("decision") == "proceed_to_interview":
            return "draft"
        return "summary_only"

    @staticmethod
    def _route_after_validation(state: RecruitmentWorkflowState) -> str:
        if state.get("validation_passed"):
            return "pass"
        if int(state.get("repair_attempts", 0)) < 1:
            return "repair"
        return "end"

    # ------------------------------------------------------------------
    # Public Runner
    # ------------------------------------------------------------------
    def run(self, request: CandidateRecruitmentWorkflowRequest) -> CandidateRecruitmentWorkflowResponse:
        with observe_span(
            "workflow.recruitment_pipeline",
            as_type="chain",
            user_id=self.recruiter_id,
            input_data=request.model_dump(mode="json"),
            tags=["langgraph", "recruitment_pipeline"],
        ) as span:
            initial_state: RecruitmentWorkflowState = {
                "candidate_id": request.candidate_id,
                "job_offer_id": request.job_offer_id,
                "department_id": request.department_id,
                "draft_language": request.draft_language,
                "company_name": request.company_name,
                "recruiter_name": request.recruiter_name,
                "interview_date": request.interview_date,
                "interview_time": request.interview_time,
                "duration_minutes": request.duration_minutes,
                "location": request.location,
                "include_email_draft": request.include_email_draft,
                "min_compatibility_for_interview": request.min_compatibility_for_interview,
                "trace_id": span.trace_id,
                "repair_attempts": 0,
                "fallback_used": False,
                "step_history": [],
            }

            final_state = self.graph.invoke(initial_state)

            if not final_state.get("intake_valid", False):
                status_label: Literal["completed", "completed_with_fallback", "rejected_low_match", "failed"] = "failed"
            elif final_state.get("decision") == "hold_or_reject":
                status_label = "rejected_low_match"
            elif final_state.get("fallback_used"):
                status_label = "completed_with_fallback"
            else:
                status_label = "completed"

            bundle = final_state.get("bundle")
            val_passed = bool(final_state.get("validation_passed", False))
            overall = float(final_state.get("overall_score", 0.0))

            record_langfuse_score(
                name="workflow_validation_passed",
                value=1.0 if val_passed else 0.0,
                trace_id=span.trace_id,
                comment=f"status={status_label} decision={final_state.get('decision')}",
            )
            record_langfuse_score(
                name="workflow_overall_compatibility",
                value=overall,
                trace_id=span.trace_id,
            )

            response = CandidateRecruitmentWorkflowResponse(
                trace_id=span.trace_id,
                status=status_label,
                candidate_id=request.candidate_id,
                job_offer_id=request.job_offer_id,
                decision=final_state.get("decision", "error"),
                overall_score=overall,
                retrieved_evidence_count=len(bundle.evidence) if bundle else 0,
                department_evaluations=final_state.get("department_evaluations", []),
                match_signals=bundle.match_signals if bundle else None,
                grounded_summary=final_state.get("grounded_summary"),
                draft_email=final_state.get("draft_email"),
                validation_passed=val_passed,
                validation_warnings=final_state.get("validation_warnings", []),
                fallback_used=bool(final_state.get("fallback_used", False)),
                error_message=final_state.get("error_message"),
                step_history=final_state.get("step_history", []),
            )
            span.set_output(
                {
                    "status": response.status,
                    "decision": response.decision,
                    "overall_score": response.overall_score,
                    "validation_passed": response.validation_passed,
                    "fallback_used": response.fallback_used,
                }
            )
            return response
