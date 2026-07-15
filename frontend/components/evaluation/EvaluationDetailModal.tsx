"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { useModal } from "@/context/ModalContext";
import { useToast } from "@/hooks/useToast";
import api from "@/lib/axios";
import type { EvaluatedCandidate } from "./EvaluatedCandidateCard";

interface RequirementScore {
  experience: string;
  required_years: number;
  candidate_years: number;
  score: number;
  matched: boolean;
}

interface ScoreBreakdown {
  skills_score: number;
  experience_score: number;
  education_score: number;
  certifications_score: number;
  languages_score: number;
  preferred_skills_score: number;
  total: number;
  skills_weight: number;
  experience_weight: number;
  education_weight: number;
  certifications_weight: number;
  languages_weight: number;
  preferred_skills_weight: number;
}

interface DepartmentEvaluation {
  department_id: number;
  department_name: string;
  compatibility: number;
  requirements: RequirementScore[];
  missing_experiences: string[];
  candidate_extra_experiences: string[];
  breakdown: ScoreBreakdown | null;
}

interface EvaluationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: EvaluatedCandidate;
}

export default function EvaluationDetailModal({
  isOpen,
  onClose,
  candidate,
}: EvaluationDetailModalProps) {
  const [evaluations, setEvaluations] = useState<DepartmentEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [togglingTalent, setTogglingTalent] = useState(false);
  const [currentIsTalent, setCurrentIsTalent] = useState(candidate?.is_talent ?? false);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<number>>(new Set());
  const { setModalOpen } = useModal();
  const toast = useToast();

  useEffect(() => {
    setCurrentIsTalent(candidate?.is_talent ?? false);
  }, [candidate?.candidate_id]);

  useEffect(() => {
    setModalOpen(isOpen);
    return () => setModalOpen(false);
  }, [isOpen, setModalOpen]);

  useEffect(() => {
    if (!isOpen || !candidate) return;
    setLoading(true);
    setError(false);
    api
      .get<DepartmentEvaluation[]>(`/evaluate/${candidate.candidate_id}/results`)
      .then((res) => {
        const sorted = [...res.data].sort((a, b) => b.compatibility - a.compatibility);
        const seen = new Set<number>();
        const deduped = sorted.filter((d) => {
          if (seen.has(d.department_id)) return false;
          seen.add(d.department_id);
          return true;
        });
        setEvaluations(deduped);
        setExpandedDepartments(new Set());
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [isOpen, candidate?.candidate_id]);

  const toggleDepartment = (deptId: number) => {
    setExpandedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
      <div className="w-full max-w-2xl overflow-hidden mrc border border-gray-200/80 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {candidate.fullname}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Détails de l&apos;évaluation par département
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" />
              <span className="text-sm">Évaluation...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <AlertCircle size={32} className="mb-2" />
              <span className="text-sm">
                Impossible de charger l&apos;évaluation.
              </span>
            </div>
          ) : evaluations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <span className="text-sm">
                Aucune évaluation disponible pour ce candidat.
              </span>
            </div>
          ) : (
            evaluations.map((dept, idx) => (
              <div
                key={`${dept.department_id}-${idx}`}
                className="border border-slate-100 mrc overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleDepartment(dept.department_id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${
                        expandedDepartments.has(dept.department_id)
                          ? "rotate-0"
                          : "-rotate-90"
                      }`}
                    />
                    <h4 className="text-sm font-semibold text-slate-900">
                      {dept.department_name}
                    </h4>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      dept.compatibility >= 70
                        ? "bg-emerald-50 text-emerald-700"
                        : dept.compatibility >= 40
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {dept.compatibility.toFixed(0)}%
                  </span>
                </button>

                {expandedDepartments.has(dept.department_id) && (
                <div className="p-4 space-y-3">
                  {dept.breakdown && (
                  <div className="mb-3 pb-3 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                      Décomposition du score
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { label: "Compétences", key: "skills_score", weight: dept.breakdown.skills_weight, value: dept.breakdown.skills_score },
                        { label: "Expérience", key: "experience_score", weight: dept.breakdown.experience_weight, value: dept.breakdown.experience_score },
                        { label: "Formation", key: "education_score", weight: dept.breakdown.education_weight, value: dept.breakdown.education_score },
                        { label: "Certifications", key: "certifications_score", weight: dept.breakdown.certifications_weight, value: dept.breakdown.certifications_score },
                        { label: "Langues", key: "languages_score", weight: dept.breakdown.languages_weight, value: dept.breakdown.languages_score },
                        { label: "Bonus", key: "preferred_skills_score", weight: dept.breakdown.preferred_skills_weight, value: dept.breakdown.preferred_skills_score },
                      ].map((item) => {
                        const barColor =
                          item.value >= 70
                            ? "bg-emerald-500"
                            : item.value >= 40
                              ? "bg-amber-500"
                              : "bg-red-400";
                        return (
                          <div key={item.key} className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-600 w-24 shrink-0">
                              {item.label}
                            </span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${Math.min(item.value, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 w-8 text-right tabular-nums">
                              {(item.weight * 100).toFixed(0)}%
                            </span>
                            <span className="text-[11px] font-medium text-slate-700 w-8 text-right tabular-nums">
                              {item.value.toFixed(0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  )}
                  {dept.requirements.map((req, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {req.matched ? (
                          <CheckCircle2
                            size={14}
                            className="text-emerald-500 shrink-0"
                          />
                        ) : (
                          <XCircle
                            size={14}
                            className="text-red-400 shrink-0"
                          />
                        )}
                        <span className="text-xs text-slate-700 truncate">
                          {req.experience}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-[11px] text-slate-400">
                          {req.candidate_years.toFixed(1)}yr /{" "}
                          {req.required_years}yr
                        </span>
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              req.matched ? "bg-emerald-500" : "bg-red-300"
                            }`}
                            style={{ width: `${Math.min(req.score, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {dept.missing_experiences.length > 0 && (
                    <div className="pt-2 border-t border-slate-50">
                      <p className="text-[11px] font-semibold text-red-500 mb-1">
                        Expériences manquantes
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {dept.missing_experiences.map((m, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {dept.candidate_extra_experiences.length > 0 && (
                    <div className="pt-2 border-t border-slate-50">
                      <p className="text-[11px] font-semibold text-emerald-600 mb-1">
                        Expériences supplémentaires
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {dept.candidate_extra_experiences.map((e, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 gap-4 bg-gray-50/70 px-6 py-4 flex items-center justify-end">
          {!currentIsTalent && (
            <button
              type="button"
              onClick={async () => {
                setTogglingTalent(true);
                try {
                  const res = await api.patch(`/evaluate/${candidate.candidate_id}/talent`, {
                    is_talent: true,
                  });
                  setCurrentIsTalent(res.data.is_talent);
                  toast.success(`${candidate.fullname} est désormais un Talent`);
                } catch {
                  toast.error("Erreur lors de la mise à jour du statut Talent");
                } finally {
                  setTogglingTalent(false);
                }
              }}
              disabled={togglingTalent}
              className="border border-gray-200 bg-indigo-800 text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-indigo-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {togglingTalent ? (
                <Loader2 size={14} className="animate-spin mr-1 inline" />
              ) : null}
              Definir comme un <span className="font-semibold">Talent</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}