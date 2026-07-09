"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, AlertCircle, User, X, Mail, Phone,
  Trophy, Briefcase, Clock, Star, UserPlus,
} from "lucide-react";
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import api from "@/lib/axios";
import { recruitmentService } from "@/services/recruitment.service";
import { jobOffersService } from "@/services/job-offers.service";
import { useToast } from "@/hooks/useToast";
import type { JobOffer } from "@/types/job-offers";
import type { Department } from "@/types/department";
import type { RecruitmentPriority } from "@/types/recruitment";
import { priorityLabels } from "@/types/recruitment";

interface TalentCardData {
  candidate_id: number;
  resume_id: number;
  fullname: string;
  photo: string | null;
  preview_url: string;
  highest_score: number;
  best_department_name: string;
  talent_date: string | null;
  talent_recruiter_name: string | null;
}

const storage_url = process.env.NEXT_PUBLIC_STORAGE_URL;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function TalentCard({ talent, onClick }: { talent: TalentCardData; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-white border border-slate-100 transition-all duration-300 flex flex-col overflow-hidden mrc cursor-pointer">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {talent.photo ? (
          <img
            src={`${storage_url}${talent.photo}`}
            alt={talent.fullname}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 bg-gradient-to-br from-indigo-50 to-slate-100">
            <User size={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-3 pt-6">
          <h3 className="text-sm font-bold text-slate-900 text-center px-2 truncate max-w-full">
            {talent.fullname}
          </h3>
        </div>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700">Score</span>
          <span className="text-xs font-bold text-indigo-700">{talent.highest_score.toFixed(0)}%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700">Département</span>
          <span className="text-[11px] text-slate-600 font-medium truncate max-w-[120px] text-right">
            {talent.best_department_name}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700">Talent depuis</span>
          <span className="text-[10px] text-slate-500">{formatDate(talent.talent_date)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700">Défini par</span>
          <span className="text-[10px] text-slate-500 truncate max-w-[120px] text-right">
            {talent.talent_recruiter_name || "-"}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ExtractedSkill {
  id: number;
  name: string;
  category_name: string;
}

interface ExtractedExperience {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
}

interface ResumeDetails {
  resume_id: number;
  recruiter_id: number;
  recruiter_name: string;
  candidat: {
    id: number;
    fullname: string;
    email: string;
    phone: string;
    photo: string | null;
    created_at: string;
  } | null;
  skills: ExtractedSkill[] | null;
  experiences: ExtractedExperience[] | null;
}

function computeTotalYears(experiences: ExtractedExperience[]): number {
  let totalDays = 0;
  for (const exp of experiences) {
    const start = new Date(exp.start_date);
    const end = exp.end_date ? new Date(exp.end_date) : new Date();
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
      totalDays += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    }
  }
  return totalDays / 365.25;
}

function TalentDetailModal({
  talent,
  onClose,
  onRecruit,
  onRemoved,
}: {
  talent: TalentCardData;
  onClose: () => void;
  onRecruit?: () => void;
  onRemoved?: () => void;
}) {
  const [details, setDetails] = useState<ResumeDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [recruitmentCount, setRecruitmentCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api
      .get<ResumeDetails>(`/resumes/${talent.resume_id}`)
      .then((res) => {
        setDetails(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [talent.resume_id]);

  const totalYears = details?.experiences
    ? computeTotalYears(details.experiences)
    : 0;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden [scrollbar-width:none] border border-gray-200/80 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Détails du talent</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            <span className="text-sm">Chargement...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <AlertCircle size={32} className="mb-2" />
            <span className="text-sm">Impossible de charger les détails.</span>
          </div>
        ) : (
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 [scrollbar-width:none] ">
            {/* Identity */}
            <div className="flex items-center gap-4">
              {details?.candidat?.photo ? (
                <img
                  src={`${storage_url}${details.candidat.photo}`}
                  alt={talent.fullname}
                  className="w-16 h-16 rounded-full object-cover object-top bg-slate-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                  <User size={28} />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-base font-bold text-slate-900 truncate">{talent.fullname}</h4>
                {details?.candidat?.email && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Mail size={12} />
                    {details.candidat.email}
                  </p>
                )}
                {details?.candidat?.phone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Phone size={12} />
                    {details.candidat.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Highest department rank */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Département principal</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{talent.best_department_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</p>
                <p className="text-lg font-bold text-indigo-700">{talent.highest_score.toFixed(0)}%</p>
              </div>
            </div>

            {/* Total experience */}
            <div className="border border-slate-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expérience totale</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalYears.toFixed(1)} <span className="text-sm font-normal text-slate-500">années</span></p>
            </div>

            {/* Skills */}
            <div className="border border-slate-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Compétences</span>
                {details?.skills && (
                  <span className="text-[10px] text-slate-400 ml-auto">{details.skills.length} compétences</span>
                )}
              </div>
              {details?.skills && details.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {details.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="text-[11px] bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Aucune compétence renseignée.</p>
              )}
            </div>
 
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Talent depuis {formatDate(talent.talent_date)}</span>
              <span>Défini par {talent.talent_recruiter_name || "-"}</span>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onRemoved && !confirmRemove && (
              <button
                type="button"
                onClick={async () => {
                  setRemoving(true);
                  try {
                    const res = await recruitmentService.list();
                    const found = res.items.filter((r) => r.candidate_id === talent.candidate_id);
                    if (found.length > 0) {
                      setRecruitmentCount(found.length);
                      setConfirmRemove(true);
                    } else {
                      await api.patch(`/evaluate/${talent.candidate_id}/talent`, { is_talent: false });
                      onRemoved?.();
                      onClose();
                    }
                  } catch {
                    // silent
                  } finally {
                    setRemoving(false);
                  }
                }}
                disabled={removing}
                className="inline-flex items-center gap-2 border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-xs hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {removing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Retirer des talents
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
          {onRecruit && !confirmRemove && (
            <button
              type="button"
              onClick={onRecruit}
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <UserPlus size={14} />
              Recruter
            </button>
          )}
        </div>
      </div>
    </div>

      {confirmRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
          <div className="w-full max-w-sm mrc border border-gray-200/80 bg-white shadow-xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Confirmer le retrait</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-semibold text-amber-600">{recruitmentCount}</span> processus de recrutement{" "}
              {recruitmentCount > 1 ? "sont" : "est"} en cours pour ce candidat.{" "}
              <span className="font-semibold">Forcer le retrait</span> supprimera tous les enregistrements
              de recrutement liés à ce talent.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setConfirmRemove(false); setRecruitmentCount(0); }}
                className="flex-1 border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  setRemoving(true);
                  try {
                    const res = await recruitmentService.list();
                    const found = res.items.filter((r) => r.candidate_id === talent.candidate_id);
                    await Promise.all(found.map((r) => recruitmentService.delete(r.id)));
                    await api.patch(`/evaluate/${talent.candidate_id}/talent`, { is_talent: false });
                    onRemoved?.();
                    onClose();
                  } catch {
                    // silent
                  } finally {
                    setRemoving(false);
                  }
                }}
                disabled={removing}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 text-xs font-medium shadow-xs hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {removing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Forcer le retrait
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RecruitModal({
  talent,
  onClose,
  onSuccess,
}: {
  talent: TalentCardData;
  onClose: () => void;
  onSuccess: () => void;
}) {
  interface DepartmentScore {
    department_id: number;
    department_name: string;
    compatibility: number;
  }

  const [departments, setDepartments] = useState<DepartmentScore[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [jobOfferId, setJobOfferId] = useState("");
  const [priority, setPriority] = useState<RecruitmentPriority>("medium");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const selectedDept = departments.find((d) => d.department_id === selectedDeptId);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<DepartmentScore[]>(`/evaluate/${talent.candidate_id}/department-scores`),
      jobOffersService.list(),
    ]).then(([deptRes, offers]) => {
      const unique = Array.from(
        new Map(deptRes.data.map((d) => [d.department_id, d])).values()
      );
      const sorted = unique.sort((a, b) => b.compatibility - a.compatibility);
      setDepartments(sorted);
      if (sorted.length > 0) setSelectedDeptId(sorted[0].department_id);

      const published = offers.filter((o) => o.status === "published");
      setJobOffers(published);

      const firstOffer = published.find((o) => o.department_id === sorted[0]?.department_id);
      if (firstOffer) setJobOfferId(firstOffer.id);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [talent.candidate_id]);

  const filteredOffers = selectedDeptId
    ? jobOffers.filter((o) => o.department_id === selectedDeptId)
    : jobOffers;

  useEffect(() => {
    if (filteredOffers.length > 0 && !filteredOffers.find((o) => o.id === jobOfferId)) {
      setJobOfferId(filteredOffers[0].id);
    }
    if (filteredOffers.length === 0) setJobOfferId("");
  }, [selectedDeptId, jobOffers]);

  const handleRecruit = async () => {
    if (!jobOfferId) {
      toast.error("Veuillez sélectionner une offre d'emploi");
      return;
    }
    setSubmitting(true);
    try {
      await recruitmentService.create({
        candidate_id: talent.candidate_id,
        job_offer_id: jobOfferId,
        priority,
        notes: notes.trim() || undefined,
      });
      toast.success(`${talent.fullname} a été recruté avec succès`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? String((err as { response: { data: { detail: string } } }).response?.data?.detail || "")
        : "";
      if (msg.includes("already exists")) {
        toast.error("Un recrutement est déjà en cours pour ce candidat et cette offre");
      } else {
        toast.error("Erreur lors du recrutement");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
      <div className="w-full max-w-3xl flex flex-col mrc border border-gray-200/80 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Recruter un candidat</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
            {talent.photo ? (
              <img src={`${storage_url}${talent.photo}`} alt={talent.fullname} className="w-12 h-12 rounded-full object-cover object-top bg-slate-100" />
            ) : (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                <User size={22} />
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-slate-900">{talent.fullname}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 size={16} className="animate-spin mr-2" /> Chargement...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-5">
                {selectedDept && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Score {selectedDept.department_name}</span>
                    <span className="text-lg font-bold text-indigo-700">{selectedDept.compatibility.toFixed(0)}%</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Offre d'emploi</label>
                  {filteredOffers.length === 0 ? (
                    <p className="text-xs text-amber-600">Aucune offre publiée pour ce département.</p>
                  ) : (
                    <select
                      value={jobOfferId}
                      onChange={(e) => setJobOfferId(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      {filteredOffers.map((offer) => (
                        <option key={offer.id} value={offer.id}>{offer.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Priorité</label>
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                          priority === p
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {priorityLabels[p]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes (optionnel)</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ajouter une note..."
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Départements</label>
                {departments.length === 0 ? (
                  <p className="text-xs text-amber-600">Aucune évaluation disponible pour ce candidat.</p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto [scrollbar-width:thin] pr-1">
                    {departments.map((dept) => (
                      <button
                        key={dept.department_id}
                        type="button"
                        onClick={() => setSelectedDeptId(dept.department_id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm border transition-colors cursor-pointer ${
                          selectedDeptId === dept.department_id
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="font-medium">{dept.department_name}</span>
                        <span className={`text-xs font-bold ${selectedDeptId === dept.department_id ? "text-indigo-700" : "text-slate-500"}`}>
                          {dept.compatibility.toFixed(0)}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleRecruit}
            disabled={submitting || !jobOfferId || filteredOffers.length === 0}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Recruter
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TalentsPage() {
  const [talents, setTalents] = useState<TalentCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<TalentCardData | null>(null);
  const [recruitTalent, setRecruitTalent] = useState<TalentCardData | null>(null);

  const fetchTalents = useCallback(() => {
    api
      .get<TalentCardData[]>("/evaluate/talents")
      .then((res) => {
        setTalents(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchTalents();
  }, [fetchTalents]);

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-slate-900">Talents</h1>
          <NotificationButton />
        </header>

        <main className="flex-1 px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-sm font-bold text-slate-800">Profils talents</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Candidats désignés comme talents par les recruteurs. Utilisez la <strong>barre de recherche</strong> et le <strong>filtre par département</strong> pour trouver un profil. Cliquez sur <strong>Recruter</strong> pour lancer le processus de recrutement.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2" />
                <span className="text-sm">Chargement des talents...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <AlertCircle size={32} className="mb-2" />
                <span className="text-sm">Impossible de charger les talents.</span>
              </div>
            ) : talents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <span className="text-sm">Aucun talent pour le moment.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {talents.map((talent) => (
                  <TalentCard
                    key={talent.candidate_id}
                    talent={talent}
                    onClick={() => setSelectedTalent(talent)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedTalent && (
        <TalentDetailModal
          talent={selectedTalent}
          onClose={() => setSelectedTalent(null)}
          onRecruit={() => {
            const t = selectedTalent;
            setSelectedTalent(null);
            setRecruitTalent(t);
          }}
          onRemoved={fetchTalents}
        />
      )}

      {recruitTalent && (
        <RecruitModal
          talent={recruitTalent}
          onClose={() => setRecruitTalent(null)}
          onSuccess={() => setRecruitTalent(null)}
        />
      )}
    </div>
  );
}
