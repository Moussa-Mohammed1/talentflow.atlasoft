"use client";

import { Activity, ActivityIcon, ActivitySquare, Loader2, Plane, Workflow } from "lucide-react";
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            <Loader2 className="animate-spin h-3 w-3 text-blue-600" />
            En cours
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Terminé
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Échoué
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-100">
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
    return status === "failed" ? "text-rose-500 font-medium" : "text-slate-400";
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
     <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center px-3.5 py-2 transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isOpen
            ? "bg-slate-100 text-slate-800 border-slate-300 shadow-inner"
            : "bg-white text-slate-600 border-black hover:bg-slate-50 hover:text-slate-800 shadow-sm"
        }`}
        title="Tâches de fond"
        >
        {/* Smoothly expanding text container on the left */}
        <span className="max-w-0 opacity-0 overflow-hidden transition-all duration-500 ease-in-out group-hover:max-w-32 group-hover:opacity-100 group-focus:max-w-32 group-focus:opacity-100 whitespace-nowrap text-xs font-medium">
            <span className="pr-2 ">tâches de fond</span>
        </span>

        {/* Icon and Badge Container */}
        <div className="relative flex items-center justify-center">
            <Workflow size={18}/>

            {runningCount > 0 && (
            <span className="absolute -top-3.5 -right-5 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 " />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 text-[10px] font-bold text-white items-center justify-center">
                {runningCount}
                </span>
            </span>
            )}
        </div>
        </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-120 not-lg:w-screen  border border-slate-200 bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 transform opacity-100 scale-100 transition-all">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              Tâches de Fond
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-200/70 text-slate-700 rounded-full">
                {jobs.length} total
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Réessayer
              </button>
              
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                <Loader2 className="animate-spin h-4 w-4 mx-auto text-blue-600 mb-2" />
                Chargement des tâches...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-rose-500 text-sm">
                {error}
                <button
                  onClick={refresh}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Réessayer
                </button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">Aucune tâche de fond trouvée
              <button
                  onClick={refresh}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Réessayer
                </button></div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 text-sm">
                        {formatJobType(job.type)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTimeAgo(job.created_at)}
                      </span>
                    </div>
                    {statusBadge(job.status)}
                  </div>

                  <p className="text-xs text-slate-600 break-words line-clamp-2 leading-relaxed">
                    {formatJobType(job.type)} {statusText(job.status)}{" "}
                    <strong className="text-slate-800 font-medium font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">
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

          <div className="p-2 border-t border-slate-100 bg-slate-50/30 text-center rounded-b-xl">

                <button
                  onClick={() => deleteAll()}
                  className="text-xs text-rose-500 hover:bg-red-500 w-full hover:text-white py-1 rounded-lg transition-all"
                >
                  Supprimer Tout
                </button>
            
          </div>
        </div>
      )}
    </div>
  );
}