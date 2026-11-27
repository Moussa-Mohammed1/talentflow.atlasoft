"use client";

import { Loader2, TerminalSquare } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { formatJobType, formatTimeAgo } from "@/types/job";
import { useJobs } from "@/hooks/useJobs";
import { useLanguage } from "@/context/LanguageContext";

export default function SystemJobs() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { jobs, runningCount, isLoading, error, refresh, deleteAll } = useJobs();
  const { language, l } = useLanguage();

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
            {l("En cours", "Running")}
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#bad80a]/40 bg-[#dff6dd] px-2 py-0.5 text-[11px] font-medium text-[#107c10]">
            {l("Terminé", "Completed")}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#f1707b]/40 bg-[#fde7e9] px-2 py-0.5 text-[11px] font-medium text-[#a80000]">
            {l("Échoué", "Failed")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#edebe9] bg-[#f3f2f1] px-2 py-0.5 text-[11px] font-medium text-[#605e5c]">
            {l("En attente", "Pending")}
          </span>
        );
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case "running":
        return l("en cours depuis", "running for");
      case "completed":
        return l("terminé depuis", "completed");
      case "failed":
        return l("échoué depuis", "failed");
      default:
        return l("en attente depuis", "pending");
    }
  };

  const statusMessageClass = (status: string) => {
    return status === "failed" ? "text-[#a80000] dark:text-[#f1707b] font-medium" : "text-[#605e5c] dark:text-[#a19f9d]";
  };

  return (
    <div className="relative inline-flex h-full items-center text-left font-atlasoft" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex h-10 w-10 items-center justify-center text-white transition-colors focus:outline-none ${
          isOpen ? "bg-[#323130]" : "hover:bg-[#323130]"
        }`}
        title={l("Tâches de fond", "Background tasks")}
        aria-label={l("Tâches de fond", "Background tasks")}
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
        <div className="absolute right-0 top-full z-50 w-96 max-w-[calc(100vw-1rem)] rounded-[2px] border border-[#edebe9] dark:border-[#3b3a39] bg-white dark:bg-[#252423] text-[#323130] dark:text-[#f3f2f1] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#edebe9] dark:border-[#3b3a39] bg-[#faf9f8] dark:bg-[#1b1a19] px-4 py-3">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-[#323130] dark:text-[#f3f2f1]">
              {l("Tâches de fond", "Background tasks")}
              <span className="rounded-[2px] bg-[#edebe9] dark:bg-[#323130] px-1.5 py-0.5 text-[11px] font-medium text-[#323130] dark:text-[#f3f2f1]">
                {jobs.length}
              </span>
            </h3>
            <button
              type="button"
              onClick={refresh}
              className="text-[12px] font-medium text-[#0078d4] dark:text-[#4ea8ff] hover:text-[#106ebe] hover:underline"
            >
              {l("Actualiser", "Refresh")}
            </button>
          </div>

          <div className="max-h-96 divide-y divide-[#edebe9] dark:divide-[#3b3a39] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-[12px] text-[#605e5c] dark:text-[#a19f9d]">
                <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin text-[#0078d4] dark:text-[#4ea8ff]" />
                {l("Chargement des tâches...", "Loading tasks...")}
              </div>
            ) : error ? (
              <div className="p-4 text-center text-[12px] text-[#a80000] dark:text-[#f1707b]">
                {error}
                <button
                  type="button"
                  onClick={refresh}
                  className="ml-2 text-[12px] text-[#0078d4] dark:text-[#4ea8ff] underline"
                >
                  {l("Réessayer", "Retry")}
                </button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-[#605e5c] dark:text-[#a19f9d]">
                {l("Aucune tâche de fond trouvée.", "No background tasks found.")}
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="px-4 py-3 transition-colors hover:bg-[#f3f2f1] dark:hover:bg-[#323130]">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-semibold text-[#323130] dark:text-[#f3f2f1]">
                        {formatJobType(job.type, language)}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8a8886]">
                        <span>{formatTimeAgo(job.created_at, language)}</span>
                        {job.queue_name && (
                          <span className="rounded-[2px] border border-[#edebe9] dark:border-[#3b3a39] px-1 py-0.2 font-mono text-[9px]">
                            {job.queue_name}
                          </span>
                        )}
                        {(job.retries ?? 0) > 0 && (
                          <span className="rounded-[2px] bg-[#fff4ce] dark:bg-[#4f3a00] px-1 py-0.2 font-medium text-[#797775] dark:text-[#fce100]">
                            {l(`Tentative ${job.retries}`, `Retry ${job.retries}`)}
                          </span>
                        )}
                      </div>
                    </div>
                    {statusBadge(job.status)}
                  </div>

                  <p className="line-clamp-2 break-words text-[11px] leading-relaxed text-[#605e5c] dark:text-[#c8c6c4]">
                    {formatJobType(job.type, language)} {statusText(job.status)}{" "}
                    <strong className="rounded-[2px] bg-[#f3f2f1] dark:bg-[#323130] px-1 py-0.5 font-mono text-[11px] font-medium text-[#323130] dark:text-[#f3f2f1]">
                      {job.target}
                    </strong>
                  </p>

                  {(job.status === "running" || job.status === "pending") && (
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-[#605e5c] dark:text-[#a19f9d]">
                        <span className="truncate">{job.current_step || l("En file d'attente", "Queued")}</span>
                        <span className="font-mono font-semibold text-[#0078d4] dark:text-[#4ea8ff]">
                          {job.progress ?? 0}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#edebe9] dark:bg-[#323130]">
                        <div
                          className="h-full rounded-full bg-[#0078d4] transition-all duration-300"
                          style={{ width: `${Math.max(4, Math.min(100, job.progress ?? 0))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <p className={`mt-1 text-[11px] ${statusMessageClass(job.status)}`}>
                    {job.message || l("Aucun détail supplémentaire", "No additional details")}
                  </p>
                  {job.status === "failed" && job.error_details && (
                    <p className="mt-1 line-clamp-2 rounded-[2px] bg-[#fde7e9]/60 dark:bg-[#a80000]/15 px-1.5 py-1 font-mono text-[10px] text-[#a80000] dark:text-[#f1707b]">
                      {job.error_details}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[#edebe9] dark:border-[#3b3a39] bg-[#faf9f8] dark:bg-[#1b1a19] p-2 text-center">
            <button
              type="button"
              onClick={() => deleteAll()}
              className="w-full rounded-[2px] py-1.5 text-[12px] font-medium text-[#a80000] dark:text-[#f1707b] transition-colors hover:bg-[#fde7e9] dark:hover:bg-[#a80000]/20"
            >
              {l("Tout supprimer", "Clear all")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
