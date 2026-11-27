"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search, FileQuestionMark, ChevronLeft, ChevronRight } from "lucide-react";
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftDocumentsIcon } from "@/components/layouts/AtlasoftIcons";
import DocumentPreviewCard from "@/components/resume/documents/DocumentPreviewCard";
import DocumentResumeInfos, {
  ResumeDetails,
} from "@/components/resume/documents/DocumentResumeInfos";
import {
  DocumentListItem,
  getResumeDocuments,
  getResumeDetails,
  revokeResumeDocumentPreviews,
} from "@/services/resume.service";
import { useLanguage } from "@/context/LanguageContext";

const ImportResumeButton = dynamic(
  () => import("@/components/resume/ImportResumeButton"),
  { ssr: false },
);

export default function DocumentsPage() {
  const { t, l } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<ResumeDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleCardClick = useCallback(async (documentId: string) => {
    setDetailsLoading(true);
    setModalOpen(true);
    try {
      const details = await getResumeDetails(documentId);
      setSelectedDetails(details || { resume_id: Number(documentId), recruiter_id: 0, recruiter_name: "", candidat: null, experiences: null, educations: null, certifications: null, skills: null, languages: null });
    } catch {
      setSelectedDetails({ resume_id: Number(documentId), recruiter_id: 0, recruiter_name: "", candidat: null, experiences: null, educations: null, certifications: null, skills: null, languages: null });
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const handleRefreshDetails = useCallback(async () => {
    if (!selectedDetails?.resume_id) return;
    try {
      const details = await getResumeDetails(String(selectedDetails.resume_id));
      setSelectedDetails(details || { resume_id: selectedDetails.resume_id, recruiter_id: 0, recruiter_name: "", candidat: null, experiences: null, educations: null, certifications: null, skills: null, languages: null });
    } catch {
      // keep existing data on error
    }
  }, [selectedDetails?.resume_id]);

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const resumeDocuments = await getResumeDocuments();
      setDocuments(resumeDocuments);
      return resumeDocuments;
    } catch {
      setError(l("Impossible de charger les documents pour le moment.", "Unable to load documents right now."));
    } finally {
      setIsLoading(false);
    }
  }, [l]);

  useEffect(() => {
    let loadedDocuments: DocumentListItem[] = [];
    let cancelled = false;

    (async () => {
      const result = await loadDocuments();
      if (!cancelled && result) {
        loadedDocuments = result;
      }
    })();

    return () => {
      cancelled = true;
      revokeResumeDocumentPreviews(loadedDocuments);
    };
  }, [loadDocuments]);

  const deduplicatedDocuments = useMemo(() => {
    const seen = new Set<string>();
    return documents.filter((doc) => {
      if (seen.has(doc.id)) {
        return false;
      }
      seen.add(doc.id);
      return true;
    });
  }, [documents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return deduplicatedDocuments;
    }

    return deduplicatedDocuments.filter((document) => {
      return (
        document.name.toLowerCase().includes(query) ||
        document.candidateName.toLowerCase().includes(query) ||
        document.role.toLowerCase().includes(query) ||
        document.category.toLowerCase().includes(query)
      );
    });
  }, [deduplicatedDocuments, searchQuery]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage]);

  return (
    <AppShell
      title={t.nav.documents}
      icon={<AtlasoftDocumentsIcon size={22} />}
      breadcrumbs={[{ label: t.nav.home, href: "/dashboard" }, { label: t.nav.documents }]}
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
              "Rechercher un candidat, un fichier, une catégorie ou un rôle...",
              "Search a candidate, file, category, or role..."
            )}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-[2px] border border-[#8a8886] dark:border-[#3b3a39] bg-white dark:bg-[#252423] py-1.5 pl-9 pr-3 text-[12.5px] text-[#323130] dark:text-[#f3f2f1] placeholder:text-[#605e5c] dark:placeholder:text-[#a19f9d] outline-none transition-colors focus:border-[#0078d4]"
          />
        </div>
      }
      headerActions={<ImportResumeButton />}
    >
        <main className="flex-1 flex flex-col min-h-0 p-4 pb-0 max-w-7xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto space-y-6 relative">
            <p className="text-sm text-slate-600 dark:text-[#c8c6c4] hidden lg:block">
              {l(
                "Importez et gérez les CV des candidats. Utilisez la barre de recherche pour filtrer, cliquez sur une carte pour voir les détails extraits (identité, compétences, expériences, formations) et lancez une ré-analyse ou évaluation.",
                "Import and manage candidate resumes. Use the search bar to filter, click any card to inspect extracted details (identity, skills, experience, education), and trigger re-analysis or evaluation."
              )}
            </p>
            <div className="bg-white dark:bg-[#252423] border rounded-full border-slate-100 dark:border-[#3b3a39] shadow-sm md:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder={l(
                    "Rechercher un candidat, un fichier, une catégorie ou un rôle...",
                    "Search a candidate, file, category, or role..."
                  )}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-10 bg-slate-50 dark:bg-[#1b1a19] hover:bg-slate-100/50 dark:hover:bg-[#252423] focus:bg-white dark:focus:bg-[#252423] border border-slate-200/80 dark:border-[#3b3a39] text-slate-900 dark:text-[#f3f2f1] px-7 py-5 rounded-full text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mm p-2 shadow-sm animate-pulse"
                  >
                    <div className="w-full aspect-[3/4] bg-slate-100 dark:bg-[#323130] rounded mb-4" />
                    <div className="h-3 bg-slate-100 dark:bg-[#323130] rounded w-3/4 mb-2" />
                    <div className="h-2 bg-slate-100 dark:bg-[#323130] rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <EmptyState title={l("Chargement impossible", "Failed to load")} message={error} />
            ) : filteredDocuments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {paginatedDocuments.map((document) => (
                  <DocumentPreviewCard
                    key={document.id}
                    document={document}
                    onClick={() => handleCardClick(document.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={l("Aucun document trouvé", "No documents found")}
                message={l(
                  "Aucun résultat ne correspond à votre recherche. Modifiez vos critères ou importez un nouveau document.",
                  "No results match your search. Adjust your query or import a new document."
                )}
              />
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

      {modalOpen && selectedDetails && (
        <DocumentResumeInfos
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedDetails(null);
          }}
          data={selectedDetails}
          onRefresh={handleRefreshDetails}
          onDeleted={() => {
            loadDocuments();
          }}
        />
      )}

      {modalOpen && detailsLoading && (
        <div className="fixed inset-0 bg-white/50 dark:bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#252423] border border-transparent dark:border-[#3b3a39] shadow-xl p-8">
            <div className="animate-spin w-8 h-8 border-2 border-slate-300 dark:border-[#3b3a39] border-t-indigo-600 dark:border-t-[#2899f5] rounded-full mx-auto" />
            <p className="text-sm text-slate-500 dark:text-[#a19f9d] mt-4">
              {l("Chargement des données...", "Loading details...")}
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-12 text-center max-w-md mx-auto space-y-3">
      <div className="w-12 h-12 flex items-center justify-center text-slate-800 dark:text-[#f3f2f1] mx-auto">
        <FileQuestionMark size={40} />
      </div>
      <h3 className="font-bold text-slate-800 dark:text-[#f3f2f1] text-sm">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-[#a19f9d] leading-relaxed">{message}</p>
    </div>
  );
}
