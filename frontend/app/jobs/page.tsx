"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import { AlertCircle, Briefcase, ChevronLeft, ChevronRight, Loader2, Plus, Search } from "lucide-react";
import { jobOffersService } from "@/services/job-offers.service";
import { DepartmentService } from "@/services/department.service";
import { useToast } from "@/hooks/useToast";
import type { Department } from "@/types/department";
import type { JobOffer } from "@/types/job-offers";
import { JobOfferCard } from "@/components/jobs/JobOfferCard";
import { DetailModal } from "@/components/jobs/DetailModal";
import { CreateOfferModal } from "@/components/jobs/CreateOfferModal";

export default function JobsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offers, setOffers] = useState<JobOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredOffers = useMemo(() => {
    if (!offers) return null;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return offers;
    return offers.filter(
      (o) =>
        o.title.toLowerCase().includes(query) ||
        (o.description ?? "").toLowerCase().includes(query) ||
        o.employment_type.toLowerCase().includes(query) ||
        o.work_mode.toLowerCase().includes(query) ||
        o.seniority_level.toLowerCase().includes(query) ||
        o.status.toLowerCase().includes(query),
    );
  }, [offers, searchQuery]);

  const totalPages = filteredOffers
    ? Math.ceil(filteredOffers.length / itemsPerPage)
    : 0;
  const paginatedOffers = filteredOffers
    ? filteredOffers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : [];
  const toast = useToast();

  const fetchOffers = useCallback(async () => {
    try {
      const data = await jobOffersService.list();
      setOffers(data);
      setError(null);
    } catch {
      setOffers([]);
      setError("Impossible de charger les offres d'emploi.");
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await DepartmentService.list();
      setDepartments(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchOffers(), fetchDepartments()]);
  }, [fetchOffers, fetchDepartments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [offers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setIsSubmitting(true);
    try {
      await jobOffersService.generateFromDescription(description);
      setIsModalOpen(false);
      setDescription("");
      await fetchOffers();
    } catch {
      toast.error("Une erreur est servenue veuillez ressayer ulterierement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailSaved = async () => {
    setSelectedOffer(null);
    await fetchOffers();
  };

  const handleDetailDeleted = async () => {
    setSelectedOffer(null);
    await fetchOffers();
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h1 className="text-lg font-bold text-slate-900 shrink-0">Offres d&apos;emploi</h1>
          <div className="relative max-w-md w-full hidden md:block mx-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Rechercher un titre, un type de contrat, un mode de travail..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200/80 px-4 py-2.5 rounded-full text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-2.5 py-2.5 bg-white text-black border text-xs font-medium hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              <Plus size={16} />
              Ajouter une offre
            </button>
            <NotificationButton />
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto px-6 pt-6">
            <div className="bg-white border rounded-full border-slate-100 shadow-sm md:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Rechercher un titre, un type de contrat, un mode de travail..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-10 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200/80 px-7 py-5 rounded-full text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm leading-7 text-slate-600">
                Les offres d&apos;emploi affichées ci-dessous ont été générées automatiquement
                par l&apos;intelligence artificielle à partir des descriptions que vous avez
                fournies. Vous pouvez les consulter, les modifier ou les compléter avant
                leur publication.
              </p>
            </div>

            {offers === null && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-3 text-sm text-slate-500">Chargement des offres...</span>
              </div>
            )}

            {error && offers !== null && (
              <div className="flex flex-col items-center justify-center py-24">
                <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                <p className="text-sm text-slate-500">{error}</p>
              </div>
            )}

            {offers !== null && !error && offers.length === 0 && (
              <div className="flex flex-col items-center justify-center mrc border border-slate-100 bg-white py-24 px-4 text-center shadow-xs mt-6">
                <div className="flex h-16 w-16 items-center justify-center mrc bg-amber-50 text-amber-500 mb-6">
                  <Briefcase className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Aucune offre pour le moment
                </h2>
                <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                  Cliquez sur &quot;Ajouter une offre&quot; pour créer votre première offre
                  d&apos;emploi à partir d&apos;une description.
                </p>
              </div>
            )}

            {offers !== null && !error && offers.length > 0 && filteredOffers && filteredOffers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {paginatedOffers.map((offer) => (
                  <JobOfferCard
                    key={offer.id}
                    offer={offer}
                    onClick={() => setSelectedOffer(offer)}
                  />
                ))}
              </div>
            )}

            {offers !== null && !error && offers.length > 0 && filteredOffers && filteredOffers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24">
                <Search className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">
                  Aucune offre ne correspond à votre recherche.
                </p>
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
      </div>

      {isModalOpen && (
        <CreateOfferModal
          description={description}
          isSubmitting={isSubmitting}
          onDescriptionChange={setDescription}
          onSubmit={handleSubmit}
          onClose={() => { setIsModalOpen(false); setDescription(""); }}
        />
      )}

      {selectedOffer && (
        <DetailModal
          offer={selectedOffer}
          departments={departments}
          onClose={() => setSelectedOffer(null)}
          onSaved={handleDetailSaved}
          onDeleted={handleDetailDeleted}
        />
      )}
    </div>
  );
}
