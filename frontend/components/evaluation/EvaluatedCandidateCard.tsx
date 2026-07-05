"use client";

import { useEffect, useState } from "react";
import { Code, Briefcase, Globe, Loader2, AlertCircle } from "lucide-react";
import api from "@/lib/axios";

export interface EvaluatedCandidate {
  candidate_id: number;
  resume_id: number;
  fullname: string;
  photo: string | null;
  preview_url: string;
  skills_count: number;
  total_experience_years: number;
  languages_count: number;
  last_evaluation_date: string;
}

const storage_url = process.env.NEXT_PUBLIC_STORAGE_URL;

export default function EvaluatedCandidateCard({ candidate }: { candidate: EvaluatedCandidate }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Blob>(candidate.preview_url, { responseType: "blob" })
      .then((res) => {
        if (!cancelled) setPreviewUrl(URL.createObjectURL(res.data));
      })
      .catch(() => {
        if (!cancelled) setPreviewError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [candidate.preview_url]);

  return (
    <div className="bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden">
      <div className="relative h-44 overflow-hidden bg-slate-100">
        {previewUrl && !previewError ? (
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top opacity-30 group-hover:opacity-20 transition-opacity duration-300"
          />
        ) : previewError ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <AlertCircle size={32} />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-3 pt-6">
          {candidate.photo && (
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md mb-2">
              <img
                src={`${storage_url}${candidate.photo}`}
                alt={candidate.fullname}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h3 className="text-sm font-bold text-slate-900 text-center px-2 truncate max-w-full">
            {candidate.fullname}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-white">
        <div className="flex flex-col items-center gap-0.5 py-2.5 px-1">
          <Code size={14} className="text-indigo-500 mb-0.5" />
          <span className="text-xs font-bold text-slate-800">{candidate.skills_count}</span>
          <span className="text-[9px] text-slate-400 uppercase tracking-wide">Compétences</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2.5 px-1">
          <Briefcase size={14} className="text-emerald-500 mb-0.5" />
          <span className="text-xs font-bold text-slate-800">{candidate.total_experience_years} yr</span>
          <span className="text-[9px] text-slate-400 uppercase tracking-wide">Expérience</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2.5 px-1">
          <Globe size={14} className="text-amber-500 mb-0.5" />
          <span className="text-xs font-bold text-slate-800">{candidate.languages_count}</span>
          <span className="text-[9px] text-slate-400 uppercase tracking-wide">Langues</span>
        </div>
      </div>
    </div>
  );
}
