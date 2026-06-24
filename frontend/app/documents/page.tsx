"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search, FileQuestionMark } from "lucide-react";
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import DocumentPreviewCard from "@/components/resume/DocumentPreviewCard";
import {
  DocumentListItem,
  getResumeDocuments,
  revokeResumeDocumentPreviews,
} from "@/services/resume.service";

const ImportResumeButton = dynamic(
  () => import("@/components/resume/ImportResumeButton"),
  { ssr: false },
);

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let loadedDocuments: DocumentListItem[] = [];

    async function loadDocuments() {
      try {
        setIsLoading(true);
        setError(null);
        const resumeDocuments = await getResumeDocuments();
        loadedDocuments = resumeDocuments;

        if (isMounted) {
          setDocuments(resumeDocuments);
        } else {
          revokeResumeDocumentPreviews(resumeDocuments);
        }
      } catch {
        if (isMounted) {
          setError("Impossible de charger les documents pour le moment.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();

    return () => {
      isMounted = false;
      revokeResumeDocumentPreviews(loadedDocuments);
    };
  }, []);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return documents;
    }

    return documents.filter((document) => {
      return (
        document.name.toLowerCase().includes(query) ||
        document.candidateName.toLowerCase().includes(query) ||
        document.role.toLowerCase().includes(query) ||
        document.category.toLowerCase().includes(query)
      );
    });
  }, [documents, searchQuery]);

  return (
    <div className="flex min-h-screen bg-slate-50  text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen [scrollbar-width:none]">
        <header className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center  z-30">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Documents</h1>
            
          </div>
          <div className="flex items-center text-lg gap-4">
            <ImportResumeButton />
            <NotificationButton />
          </div>
        </header>

        <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6 [scrollbar-width:none]">
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
              {filteredDocuments.map((document) => (
                <DocumentPreviewCard key={document.id} document={document} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aucun document trouvé"
              message="Aucun résultat ne correspond à votre recherche. Modifiez vos critères ou importez un nouveau document."
            />
          )}
        </main>
      </div>
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
