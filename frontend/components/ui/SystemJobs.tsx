"use client";

import { Loader2, TerminalSquare } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { formatJobType, formatTimeAgo } from "@/types/job";
import { useJobs } from "@/hooks/useJobs";

export default function SystemJobs() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { jobs, runningCount, isLoading, error, refresh, deleteAll } = useJobs();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statusBadge = (status: string) => {
    switch (status) {
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#c7e0f4] bg-[#eff6fc] px-2 py-0.5 text-[11px] font-medium text-[#0078d4]">
            <Loader2 className="h-3 w-3 animate-spin text-[#0078d4]" />
            En cours
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#bad80a]/40 bg-[#dff6dd] px-2 py-0.5 text-[11px] font-medium text-[#107c10]">
            Terminé
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#f1707b]/40 bg-[#fde7e9] px-2 py-0.5 text-[11px] font-medium text-[#a80000]">
            Échoué
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#edebe9] bg-[#f3f2f1] px-2 py-0.5 text-[11px] font-medium text-[#605e5c]">
            En attente
          </span>
        );
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case "running":
        return "en cours depuis";
      case "completed":
        return "terminé depuis";
      case "failed":
        return "échoué depuis";
      default:
        return "en attente depuis";
    }
  };

  const statusMessageClass = (status: string) => {
    return status === "failed" ? "text-[#a80000] font-medium" : "text-[#605e5c]";
  };

  return (
    <div className="relative inline-flex h-full items-center text-left font-atlasoft" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex h-10 w-10 items-center justify-center text-white transition-colors focus:outline-none ${
          isOpen ? "bg-[#323130]" : "hover:bg-[#323130]"
        }`}
        title="Tâches de fond"
        aria-label="Tâches de fond"
        aria-expanded={isOpen}
      >
        <TerminalSquare size={16} strokeWidth={1.75} />
        {runningCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0078d4] px-1 text-[10px] font-bold leading-none text-white ring-1 ring-[#1b1a19]">
            {runningCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 w-96 max-w-[calc(100vw-1rem)] rounded-[2px] border border-[#edebe9] bg-white text-[#323130] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#edebe9] bg-[#faf9f8] px-4 py-3">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-[#323130]">
              Tâches de fond
              <span className="rounded-[2px] bg-[#edebe9] px-1.5 py-0.5 text-[11px] font-medium text-[#323130]">
                {jobs.length}
              </span>
            </h3>
            <button
              type="button"
              onClick={refresh}
              className="text-[12px] font-medium text-[#0078d4] hover:text-[#106ebe] hover:underline"
            >
              Actualiser
            </button>
          </div>

          <div className="max-h-96 divide-y divide-[#edebe9] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-[12px] text-[#605e5c]">
                <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin text-[#0078d4]" />
                Chargement des tâches...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-[12px] text-[#a80000]">
                {error}
                <button
                  type="button"
                  onClick={refresh}
                  className="ml-2 text-[12px] text-[#0078d4] underline"
                >
                  Réessayer
                </button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-[#605e5c]">
                Aucune tâche de fond trouvée.
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="px-4 py-3 transition-colors hover:bg-[#f3f2f1]">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-semibold text-[#323130]">
                        {formatJobType(job.type)}
                      </span>
                      <span className="text-[10px] text-[#8a8886]">
                        {formatTimeAgo(job.created_at)}
                      </span>
                    </div>
                    {statusBadge(job.status)}
                  </div>

                  <p className="line-clamp-2 break-words text-[11px] leading-relaxed text-[#605e5c]">
                    {formatJobType(job.type)} {statusText(job.status)}{" "}
                    <strong className="rounded-[2px] bg-[#f3f2f1] px-1 py-0.5 font-mono text-[11px] font-medium text-[#323130]">
                      {job.target}
                    </strong>
                  </p>

                  <p className={`mt-1 text-[11px] ${statusMessageClass(job.status)}`}>
                    {job.message || "Aucun détail supplémentaire"}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[#edebe9] bg-[#faf9f8] p-2 text-center">
            <button
              type="button"
              onClick={() => deleteAll()}
              className="w-full rounded-[2px] py-1.5 text-[12px] font-medium text-[#a80000] transition-colors hover:bg-[#fde7e9]"
            >
              Tout supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
