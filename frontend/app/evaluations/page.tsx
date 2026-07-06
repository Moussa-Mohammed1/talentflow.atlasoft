"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import EvaluatedCandidateCard, { type EvaluatedCandidate } from "@/components/evaluation/EvaluatedCandidateCard";
import EvaluationDetailModal from "@/components/evaluation/EvaluationDetailModal";
import api from "@/lib/axios";

export default function EvaluationsPage() {
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
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-slate-900">Évaluations</h1>
          <NotificationButton/>
        </header>

        <main className="flex-1 px-6 py-3">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-sm font-bold text-slate-800">Candidats évalués</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Consultez les profils déjà évalués par l&apos;intelligence artificielle.
              </p>
              <p className="text-[11px]  mt-0.5">
                <span className="font-bold text-black">* </span> Après avoir consulté les résultats détaillés de l'évaluation du candidat, vous pouvez décider de le désigner comme un talent ou non. Pour en savoir plus sur les privilèges associés au statut de talent, veuillez consulter la page d'aide.</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2" />
                <span className="text-sm">Chargement des candidats évalués...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <AlertCircle size={32} className="mb-2" />
                <span className="text-sm">Impossible de charger les candidats évalués.</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <span className="text-sm">Aucun candidat évalué pour le moment.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {candidates.slice(0, 4).map((candidate) => (
                  <EvaluatedCandidateCard key={candidate.candidate_id} candidate={candidate} onClick={() => setSelectedCandidate(candidate)} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <EvaluationDetailModal
        isOpen={selectedCandidate !== null}
        onClose={() => setSelectedCandidate(null)}
        candidate={selectedCandidate!}
      />
    </div>
  );
}
