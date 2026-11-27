"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftEvaluationsIcon } from "@/components/layouts/AtlasoftIcons";
import EvaluatedCandidateCard, { type EvaluatedCandidate } from "@/components/evaluation/EvaluatedCandidateCard";
import EvaluationDetailModal from "@/components/evaluation/EvaluationDetailModal";
import api from "@/lib/axios";
import { useLanguage } from "@/context/LanguageContext";

export default function EvaluationsPage() {
  const { t, l } = useLanguage();
  const [candidates, setCandidates] = useState<EvaluatedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<EvaluatedCandidate | null>(null);

  useEffect(() => {
    api
      .get<EvaluatedCandidate[]>("/evaluate/evaluated")
      .then((res) => {
        setCandidates(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <AppShell
      title={t.nav.evaluations}
      icon={<AtlasoftEvaluationsIcon size={22} />}
      breadcrumbs={[{ label: t.nav.home, href: "/dashboard" }, { label: t.nav.evaluations }]}
      backgroundClassName="bg-[#f3f2f1]"
    >
      <main className="flex-1 px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-800 dark:text-[#f3f2f1]">
              {l("Candidats évalués", "Evaluated candidates")}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-[#a19f9d] mt-0.5">
              {l(
                "Consultez les profils déjà évalués par l'intelligence artificielle. Chaque candidat affiche son score de compatibilité par département, ses compétences, expériences et langues. Cliquez sur le bouton Talent pour marquer un profil prometteur.",
                "Browse candidate profiles already evaluated by AI. Each card summarizes department compatibility, skills, experience, and languages. Open any profile and toggle Talent to bookmark top candidates."
              )}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-[#c8c6c4] mt-0.5">
              <span className="font-bold text-black dark:text-white">* </span>
              {l(
                "Après avoir consulté les résultats détaillés de l'évaluation du candidat, vous pouvez décider de le désigner comme un talent ou non. Consultez la page d'aide pour en savoir plus.",
                "After reviewing detailed evaluation breakdowns, decide whether to mark the candidate as a Talent. See the Help guide for details."
              )}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" />
              <span className="text-sm">
                {l("Chargement des candidats évalués...", "Loading evaluated candidates...")}
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertCircle size={32} className="mb-2" />
              <span className="text-sm">
                {l("Impossible de charger les candidats évalués.", "Unable to load evaluated candidates.")}
              </span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span className="text-sm">
                {l("Aucun candidat évalué pour le moment.", "No evaluated candidates yet.")}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {candidates.slice(0, 4).map((candidate) => (
                <EvaluatedCandidateCard
                  key={candidate.candidate_id}
                  candidate={candidate}
                  onClick={() => setSelectedCandidate(candidate)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <EvaluationDetailModal
        isOpen={selectedCandidate !== null}
        onClose={() => setSelectedCandidate(null)}
        candidate={selectedCandidate!}
      />
    </AppShell>
  );
}
