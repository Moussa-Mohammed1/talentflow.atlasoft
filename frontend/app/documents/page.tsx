"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search, FileQuestionMark, ChevronLeft, ChevronRight } from "lucide-react";
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import DocumentPreviewCard from "@/components/resume/DocumentPreviewCard";
import DocumentResumeInfos, {
  ResumeDetails,
} from "@/components/resume/DocumentResumeInfos";
import {
  DocumentListItem,
  getResumeDocuments,
  getResumeDetails,
  revokeResumeDocumentPreviews,
} from "@/services/resume.service";
import SystemJobs from "@/components/ui/SystemJobs";

const ImportResumeButton = dynamic(
  () => import("@/components/resume/ImportResumeButton"),
  { ssr: false },
);

export default function DocumentsPage() {
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
      setSelectedDetails(details || { resume_id: Number(documentId), candidat: null, experiences: null, educations: null, certifications: null, skills: null, languages: null });
    } catch {
      setSelectedDetails({ resume_id: Number(documentId), candidat: null, experiences: null, educations: null, certifications: null, skills: null, languages: null });
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const resumeDocuments = await getResumeDocuments();
      setDocuments(resumeDocuments);
      return resumeDocuments;
    } catch {
      setError("Impossible de charger les documents pour le moment.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    <div className="flex min-h-screen bg-slate-50  text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen [scrollbar-width:none]">
        <header className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center  z-30">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Documents</h1>
            
          </div>
          <div className="flex items-center text-lg gap-4">
             <SystemJobs/>
             <ImportResumeButton />
            <NotificationButton />
            
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 p-8 pb-0 max-w-7xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto space-y-6 relative">
            <div className="bg-white border rounded-full border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Rechercher un candidat, un fichier, une catégorie ou un rôle..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-10 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200/80 px-7 py-5 rounded-full text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-white border border-slate-100 rounded-sm p-2 shadow-sm animate-pulse"
                  >
                    <div className="w-full aspect-[3/4] bg-slate-100 rounded mb-4" />
                    <div className="h-3 bg-slate-100 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <EmptyState title="Chargement impossible" message={error} />
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
                title="Aucun document trouvé"
                message="Aucun résultat ne correspond à votre recherche. Modifiez vos critères ou importez un nouveau document."
              />
            )}
          </div>

          {totalPages > 1 && (
            <div className="sticky bottom-0 flex items-center justify-center gap-2 py-3 bg-white/90 backdrop-blur-sm border-t border-slate-100">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[36px] h-9 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    page === currentPage
                      ? "border border-black text-black"
                      : " bg-white text-black border hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </main>
      </div>

      {modalOpen && selectedDetails && (
        <DocumentResumeInfos
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedDetails(null);
          }}
          data={selectedDetails}
          onDeleted={() => {
            loadDocuments();
          }}
        />
      )}

      {modalOpen && detailsLoading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-indigo-600 rounded-full mx-auto" />
            <p className="text-sm text-slate-500 mt-4">Chargement des données...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
      <div className="w-12 h-12 flex items-center justify-center text-slate-800 mx-auto">
        <FileQuestionMark size={40} />
      </div>
      <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
    </div>
  );
}
