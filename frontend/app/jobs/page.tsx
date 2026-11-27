"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftJobsIcon } from "@/components/layouts/AtlasoftIcons";
import { AlertCircle, Briefcase, ChevronLeft, ChevronRight, Loader2, Plus, Search } from "lucide-react";
import { jobOffersService } from "@/services/job-offers.service";
import { jobService } from "@/services/job.service";
import { DepartmentService } from "@/services/department.service";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/context/LanguageContext";
import type { Department } from "@/types/department";
import type { JobOffer } from "@/types/job-offers";
import { JobOfferCard } from "@/components/jobs/JobOfferCard";
import { DetailModal } from "@/components/jobs/DetailModal";
import { CreateOfferModal } from "@/components/jobs/CreateOfferModal";

export default function JobsPage() {
  const { t, l } = useLanguage();
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
      setCurrentPage(1);
      setError(null);
    } catch {
      setOffers([]);
      setError(l("Impossible de charger les offres d'emploi.", "Unable to load job offers."));
    }
  }, [l]);

  useEffect(() => {
    let cancelled = false;

    jobOffersService
      .list()
      .then((data) => {
        if (!cancelled) {
          setOffers(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOffers([]);
          setError(l("Impossible de charger les offres d'emploi.", "Unable to load job offers."));
        }
      });

    DepartmentService.list()
      .then((data) => {
        if (!cancelled) setDepartments(data);
      })
      .catch(() => {
        // non-critical
      });

    return () => {
      cancelled = true;
    };
  }, [l]);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setIsSubmitting(true);
    try {
      const accepted = await jobOffersService.generateFromDescriptionAsync(description);
      setIsModalOpen(false);
      setDescription("");
      toast.success(
        l(
          "Génération de l'offre en cours en arrière-plan...",
          "Generating job offer in the background...",
        ),
      );
      await jobService.waitForJob(accepted.job_id);
      await fetchOffers();
      toast.success(l("Offre d'emploi générée avec succès.", "Job offer generated successfully."));
    } catch {
      toast.error(l("Une erreur est survenue, veuillez réessayer ultérieurement.", "An error occurred, please try again later."));
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
    <AppShell
      title={t.nav.jobOffersPlural}
      icon={<AtlasoftJobsIcon size={22} />}
      breadcrumbs={[{ label: t.nav.home, href: "/dashboard" }, { label: t.nav.jobOffersPlural }]}
      backgroundClassName="bg-[#f3f2f1]"
      headerCenter={
        <div className="relative hidden md:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c]"
            size={15}
          />
          <input
            type="text"
            placeholder={l(
              "Rechercher un titre, un type de contrat, un mode de travail...",
              "Search a title, contract type, or work mode..."
            )}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-[2px] border border-[#8a8886] dark:border-[#3b3a39] bg-white dark:bg-[#252423] py-1.5 pl-9 pr-3 text-[12.5px] text-[#323130] dark:text-[#f3f2f1] placeholder:text-[#605e5c] dark:placeholder:text-[#a19f9d] outline-none transition-colors focus:border-[#0078d4]"
          />
        </div>
      }
      headerActions={
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-[2px] border border-[#0078d4] bg-[#0078d4] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[#106ebe] transition-colors cursor-pointer font-atlasoft"
        >
          <Plus size={15} />
          {l("Ajouter une offre", "Add job offer")}
        </button>
      }
    >
        <main className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto px-6 pt-6">
            <div className="bg-white dark:bg-[#252423] border rounded-full border-slate-100 dark:border-[#3b3a39] shadow-sm md:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder={l(
                    "Rechercher un titre, un type de contrat, un mode de travail...",
                    "Search a title, contract type, or work mode..."
                  )}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-10 bg-slate-50 dark:bg-[#1b1a19] hover:bg-slate-100/50 dark:hover:bg-[#252423] focus:bg-white dark:focus:bg-[#252423] border border-slate-200/80 dark:border-[#3b3a39] text-slate-900 dark:text-[#f3f2f1] px-7 py-5 rounded-full text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm leading-7 text-slate-600 dark:text-[#c8c6c4]">
                {l(
                  "Gérez les offres d'emploi. Les annonces sont générées automatiquement par l'IA à partir des descriptions fournies. Seules les offres au statut Publiée sont disponibles pour le recrutement.",
                  "Manage job offers. Listings are structured automatically by AI from your descriptions. Only offers with Published status are available for recruitment."
                )}
              </p>
            </div>

            {offers === null && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-3 text-sm text-slate-500 dark:text-[#a19f9d]">
                  {l("Chargement des offres...", "Loading offers...")}
                </span>
              </div>
            )}

            {error && offers !== null && (
              <div className="flex flex-col items-center justify-center py-24">
                <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                <p className="text-sm text-slate-500 dark:text-[#a19f9d]">{error}</p>
              </div>
            )}

            {offers !== null && !error && offers.length === 0 && (
              <div className="flex flex-col items-center justify-center mrc border border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423] py-24 px-4 text-center shadow-xs mt-6">
                <div className="flex h-16 w-16 items-center justify-center mrc bg-amber-50 dark:bg-amber-950/40 text-amber-500 mb-6">
                  <Briefcase className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-[#f3f2f1] mb-2">
                  {l("Aucune offre pour le moment", "No job offers yet")}
                </h2>
                <p className="text-sm text-slate-500 dark:text-[#a19f9d] max-w-md leading-relaxed">
                  {l(
                    'Cliquez sur "Ajouter une offre" pour créer votre première offre d\'emploi à partir d\'une description.',
                    'Click "Add job offer" to create your first job listing from a description.'
                  )}
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
                  {l("Aucune offre ne correspond à votre recherche.", "No job offers match your search.")}
                </p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="sticky bottom-0 flex items-center justify-center gap-2 py-3 bg-white/90 dark:bg-[#1b1a19]/90 backdrop-blur-sm border-t border-slate-100 dark:border-[#3b3a39]">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 dark:border-[#3b3a39] text-slate-500 dark:text-[#a19f9d] hover:bg-slate-100 dark:hover:bg-[#323130] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[36px] h-9 text-xs font-bold transition-colors cursor-pointer ${
                    page === currentPage
                      ? "border border-black dark:border-[#2899f5] text-black dark:text-[#4ea8ff]"
                      : "bg-white dark:bg-[#252423] text-black dark:text-[#f3f2f1] border hover:bg-slate-100 dark:hover:bg-[#323130] border-slate-200 dark:border-[#3b3a39]"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 dark:border-[#3b3a39] text-slate-500 dark:text-[#a19f9d] hover:bg-slate-100 dark:hover:bg-[#323130] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </main>

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
    </AppShell>
  );
}
