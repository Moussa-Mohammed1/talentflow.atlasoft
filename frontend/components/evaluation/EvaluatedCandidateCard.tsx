"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import api from "@/lib/axios";
import { useLanguage } from "@/context/LanguageContext";

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
  is_talent?: boolean;
}

const storage_url = process.env.NEXT_PUBLIC_STORAGE_URL;

export default function EvaluatedCandidateCard({ candidate, onClick }: { candidate: EvaluatedCandidate; onClick?: () => void }) {
  const { l } = useLanguage();
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
    <div className="bg-white dark:bg-[#252423] border cursor-pointer border-slate-100 dark:border-[#3b3a39] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden" onClick={onClick}>
      <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-[#1b1a19]">
        {previewUrl && !previewError ? (
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top opacity-30 group-hover:opacity-20 transition-opacity duration-300"
          />
        ) : previewError ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-[#605e5c]">
            <AlertCircle size={32} />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-[#605e5c]">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/40 to-transparent dark:from-[#252423]/95 dark:via-[#252423]/50" />

        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-3 pt-6">
          {candidate.photo && (
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white dark:border-[#252423] shadow-md mb-2">
              <img
                src={`${storage_url}${candidate.photo}`}
                alt={candidate.fullname}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1] text-center px-2 truncate max-w-full">
            {candidate.fullname}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-[#3b3a39] border-t border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423]">
        <div className="flex flex-col items-center gap-0.5 py-2.5 px-1">
          <span className="text-xs font-bold text-slate-800 dark:text-[#f3f2f1]">{candidate.skills_count}</span>
          <span className="text-[9px] text-slate-400 dark:text-[#a19f9d] uppercase tracking-wide">{l("Compétences", "Skills")}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2.5 px-1">
          <span className="text-xs font-bold text-slate-800 dark:text-[#f3f2f1]">
            {candidate.total_experience_years} {l("ans", "yrs")}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-[#a19f9d] uppercase tracking-wide">{l("Expérience", "Experience")}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2.5 px-1">
          <span className="text-xs font-bold text-slate-800 dark:text-[#f3f2f1]">{candidate.languages_count}</span>
          <span className="text-[9px] text-slate-400 dark:text-[#a19f9d] uppercase tracking-wide">{l("Langues", "Languages")}</span>
        </div>
      </div>
    </div>
  );
}
