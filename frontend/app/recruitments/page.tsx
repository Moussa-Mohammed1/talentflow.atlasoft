"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  SlidersHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftRecruitIcon } from "@/components/layouts/AtlasoftIcons";
import { recruitmentService } from "@/services/recruitment.service";
import { RecruitmentCard } from "@/components/recruitment/RecruitmentCard";
import { RecruitmentDetailModal } from "@/components/recruitment/RecruitmentDetailModal";
import type { RecruitmentListItem } from "@/types/recruitment";
import { statusLabels, priorityLabels } from "@/types/recruitment";

export default function RecruitmentsPage() {
  const [items, setItems] = useState<RecruitmentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtersRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emailTargetId, setEmailTargetId] = useState<string | null>(null);
  const [interviewTargetId, setInterviewTargetId] = useState<string | null>(null);

  const fetchRecruitments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recruitmentService.list({
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError("Impossible de charger les recrutements.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchRecruitments();
  }, [fetchRecruitments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (showFilters && filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  const totalPages = Math.ceil(total / itemsPerPage);

  const handleView = (id: string) => setSelectedId(id);
  const handleSendEmail = (id: string) => {
    setEmailTargetId(id);
    setSelectedId(id);
  };
  const handleScheduleInterview = (id: string) => {
    setInterviewTargetId(id);
    setSelectedId(id);
  };

  return (
    <AppShell
      title="Recrutements"
      icon={<AtlasoftRecruitIcon size={22} />}
      breadcrumbs={[{ label: "Accueil", href: "/dashboard" }, { label: "Recrutements" }]}
      backgroundClassName="bg-[#f3f2f1]"
      headerCenter={
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c]" size={15} />
          <input
            type="text"
            placeholder="Rechercher un candidat, un poste..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[2px] border border-[#8a8886] bg-white py-1.5 pl-9 pr-3 text-[12.5px] text-[#323130] outline-none transition-colors focus:border-[#0078d4]"
          />
        </div>
      }
      headerActions={
        <div ref={filtersRef} className="relative flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-[2px] border px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer font-atlasoft ${
              showFilters
                ? "border-[#0078d4] bg-[#eff6fc] text-[#0078d4]"
                : "border-[#8a8886] bg-white text-[#323130] hover:bg-[#f3f2f1]"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filtres
          </button>
          {showFilters && (
            <div className="absolute right-0 top-full z-40 mt-1.5 min-w-[220px] rounded-[2px] border border-[#edebe9] bg-white p-4 shadow-xl">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#605e5c]">Statut</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-[2px] border border-[#8a8886] px-3 py-1.5 text-xs outline-none focus:border-[#0078d4]"
                  >
                    <option value="">Tous</option>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#605e5c]">Priorité</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full rounded-[2px] border border-[#8a8886] px-3 py-1.5 text-xs outline-none focus:border-[#0078d4]"
                  >
                    <option value="">Toutes</option>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                {(statusFilter || priorityFilter) && (
                  <button
                    onClick={() => { setStatusFilter(""); setPriorityFilter(""); }}
                    className="flex w-full cursor-pointer items-center justify-center gap-1 py-1 text-xs text-[#0078d4] hover:underline"
                  >
                    <X size={12} /> Réinitialiser
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      }
    >
        <main className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto px-6 pt-6">
            <div className="mb-6">
              <p className="text-sm leading-7 text-slate-600">
                Gérez les recrutements en cours. Consultez les <strong>fiches candidates</strong> avec leurs informations, notes et score département. Dans le détail, accédez aux onglets <strong>Entretien</strong> pour planifier, <strong>Email</strong> pour générer et envoyer un message, et <strong>Actions</strong> pour annuler ou supprimer le recrutement.
              </p>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-3 text-sm text-slate-500">Chargement...</span>
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-24">
                <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                <p className="text-sm text-slate-500">{error}</p>
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="flex flex-col items-center justify-center mrc border border-slate-100 bg-white py-24 px-4 text-center shadow-xs mt-6">
                <div className="flex h-16 w-16 items-center justify-center mrc bg-indigo-50 text-indigo-500 mb-6">
                  <UserPlus className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Aucun recrutement pour le moment
                </h2>
                <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                  Les recrutements apparaîtront ici une fois que vous aurez décidé
                  de recruter un candidat depuis la page des talents.
                </p>
              </div>
            )}

            {!loading && !error && items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item) => (
                  <RecruitmentCard
                    key={item.id}
                    item={item}
                    onView={() => handleView(item.id)}
                    onSendEmail={() => handleSendEmail(item.id)} 
                  />
                ))}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="sticky bottom-0 flex items-center justify-center gap-2 py-3 bg-white/90 backdrop-blur-sm border-t border-slate-100">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[36px] h-9 text-xs font-bold transition-colors cursor-pointer ${
                    page === currentPage
                      ? "border border-black text-black"
                      : "bg-white text-black border hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </main>

      {selectedId && (
        <RecruitmentDetailModal
          recruitmentId={selectedId}
          onClose={() => { setSelectedId(null); setEmailTargetId(null); setInterviewTargetId(null); }}
          onUpdated={fetchRecruitments}
        />
      )}
    </AppShell>
  );
}
