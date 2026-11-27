"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { useModal } from "@/context/ModalContext";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/context/LanguageContext";
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
  const { t, l } = useLanguage();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 dark:bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl overflow-hidden border border-gray-200/80 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xl">
        <div className="border-b border-gray-100 dark:border-[#3b3a39] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[#f3f2f1]">
              {candidate.fullname}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#a19f9d] mt-0.5">
              {l("Détails de l'évaluation par département", "Evaluation details by department")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-[#f3f2f1] p-1 hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" />
              <span className="text-sm">{l("Évaluation...", "Loading evaluation...")}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <AlertCircle size={32} className="mb-2" />
              <span className="text-sm">
                {l("Impossible de charger l'évaluation.", "Unable to load evaluation.")}
              </span>
            </div>
          ) : evaluations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <span className="text-sm">
                {l("Aucune évaluation disponible pour ce candidat.", "No evaluation available for this candidate.")}
              </span>
            </div>
          ) : (
            evaluations.map((dept, idx) => (
              <div
                key={`${dept.department_id}-${idx}`}
                className="border border-slate-100 dark:border-[#3b3a39] mrc overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleDepartment(dept.department_id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-[#1b1a19] border-b border-slate-100 dark:border-[#3b3a39] hover:bg-slate-100 dark:hover:bg-[#323130] transition-colors"
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
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-[#f3f2f1]">
                      {dept.department_name}
                    </h4>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      dept.compatibility >= 70
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                        : dept.compatibility >= 40
                          ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                          : "bg-red-50 dark:bg-rose-950/50 text-red-700 dark:text-rose-300"
                    }`}
                  >
                    {dept.compatibility.toFixed(0)}%
                  </span>
                </button>

                {expandedDepartments.has(dept.department_id) && (
                <div className="p-4 space-y-3">
                  
                  {/* {dept.requirements.map((req, idx) => (
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
                  ))} */}

                  {dept.breakdown && (() => {
                    const bd = dept.breakdown!;
                    const items = [
                      { label: l("Compétences", "Skills"), key: "skills" as const, weight: bd.skills_weight },
                      { label: l("Expérience", "Experience"), key: "experience" as const, weight: bd.experience_weight },
                      { label: l("Formation", "Education"), key: "education" as const, weight: bd.education_weight },
                      { label: l("Certifications", "Certifications"), key: "certifications" as const, weight: bd.certifications_weight },
                      { label: l("Langues", "Languages"), key: "languages" as const, weight: bd.languages_weight },
                      { label: l("Bonus", "Preferred"), key: "preferred_skills" as const, weight: bd.preferred_skills_weight },
                    ];
                    return (
                    <div className="pt-3 border-t border-slate-50 dark:border-[#3b3a39]">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-[#a19f9d] mb-2 uppercase tracking-wider">
                      {l("Décomposition du score", "Score breakdown")}
                    </p>
                    <div className="space-y-1.5">
                      {items.map((item) => {
                        const score = bd[`${item.key}_score`];
                        const contribution = score * item.weight;
                        return (
                          <div key={item.key} className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500 dark:text-[#a19f9d] w-28 shrink-0">{item.label}</span>
                            <div className="flex-1 bg-slate-100 dark:bg-[#323130] h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${score}%`,
                                  backgroundColor:
                                    score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444",
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-slate-600 dark:text-[#c8c6c4] w-12 text-right">
                              {score.toFixed(0)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-[#8a8886] w-16 text-right">
                              {(item.weight * 100).toFixed(0)}%
                            </span>
                            <span className="text-[11px] font-mono text-slate-700 dark:text-[#f3f2f1] w-12 text-right font-semibold">
                              {(contribution).toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                    );
                  })()}

                  {dept.missing_experiences.length > 0 && (
                    <div className="pt-2 border-t border-slate-50 dark:border-[#3b3a39]">
                      <p className="text-[11px] font-semibold text-red-500 dark:text-rose-400 mb-1">
                        {l("Compétences manquantes", "Missing skills")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {dept.missing_experiences.map((m, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-300 px-1.5 py-0.5 rounded"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {dept.candidate_extra_experiences.length > 0 && (
                    <div className="pt-2 border-t border-slate-50 dark:border-[#3b3a39]">
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                        {l("Compétences supplémentaires", "Extra skills")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {dept.candidate_extra_experiences.map((e, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded"
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

        <div className="border-t border-gray-100 dark:border-[#3b3a39] gap-4 bg-gray-50/70 dark:bg-[#1b1a19] px-6 py-4 flex items-center justify-end">
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
                  toast.success(
                    l(`${candidate.fullname} est désormais un Talent`, `${candidate.fullname} is now marked as Talent`)
                  );
                } catch {
                  toast.error(l("Erreur lors de la mise à jour du statut Talent", "Failed to update Talent status"));
                } finally {
                  setTogglingTalent(false);
                }
              }}
              disabled={togglingTalent}
              className="border border-gray-200 dark:border-[#0078d4] bg-indigo-800 dark:bg-[#0078d4] text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-indigo-900 dark:hover:bg-[#106ebe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {togglingTalent ? (
                <Loader2 size={14} className="animate-spin mr-1 inline" />
              ) : null}
              {l("Définir comme un ", "Mark as ")}
              <span className="font-semibold">Talent</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}