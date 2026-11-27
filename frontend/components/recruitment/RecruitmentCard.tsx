"use client";

import { CalendarDays, Mail, User, UserPlus } from "lucide-react";
import type { RecruitmentListItem } from "@/types/recruitment";
import { statusColors, priorityColors } from "@/types/recruitment";
import { useLanguage } from "@/context/LanguageContext";

const storage_url = process.env.NEXT_PUBLIC_STORAGE_URL;

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export function RecruitmentCard({
  item,
  onView,
  onSendEmail,
}: {
  item: RecruitmentListItem;
  onView: () => void;
  onSendEmail: () => void;
}) {
  const { locale, t, l } = useLanguage();

  return (
    <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] transition-all duration-300 flex flex-col overflow-hidden mrc">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {item.candidate?.photo ? (
            <img
              src={`${storage_url}${item.candidate.photo}`}
              alt={item.candidate.fullname}
              className="w-10 h-10 rounded-full object-cover object-top bg-slate-100 dark:bg-[#1b1a19]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-50 dark:bg-[#0078d4]/20 text-indigo-400 dark:text-[#4ea8ff] shrink-0">
              <User size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1] truncate">
              {item.candidate?.fullname || l("Inconnu", "Unknown")}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#a19f9d] truncate">
              {item.job_offer?.title || l("Aucun poste", "No position")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 mm px-2 py-0.5 text-[10px] font-medium ${statusColors[item.status]}`}>
            {t.recruitmentStatus[item.status]}
          </span>
          <span className={`inline-flex items-center gap-1 mm px-2 py-0.5 text-[10px] font-medium ${priorityColors[item.priority]}`}>
            {t.recruitmentPriority[item.priority]}
          </span>
        </div>

        {item.compatibility_score !== null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-[#323130] rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 dark:bg-[#2899f5] rounded-full transition-all"
                style={{ width: `${Math.min(item.compatibility_score, 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-700 dark:text-[#4ea8ff] shrink-0">
              {item.compatibility_score.toFixed(0)}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-[#8a8886]">
          <span className="flex items-center gap-1">
            <CalendarDays size={11} />
            {formatDate(item.created_at, locale)}
          </span>
          {item.assigned_recruiter && (
            <span className="flex items-center gap-1 truncate max-w-[120px]">
              <UserPlus size={11} />
              {item.assigned_recruiter.fullname}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-slate-50 dark:border-[#3b3a39]">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex-1 text-[11px] font-medium text-slate-600 dark:text-[#c8c6c4] hover:text-indigo-600 dark:hover:text-[#4ea8ff] hover:bg-indigo-50 dark:hover:bg-[#323130] py-1.5 rounded transition-colors cursor-pointer"
          >
            {l("Voir", "View")}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSendEmail(); }}
            className="flex-1 text-[11px] font-medium text-slate-600 dark:text-[#c8c6c4] hover:text-blue-600 dark:hover:text-[#4ea8ff] hover:bg-blue-50 dark:hover:bg-[#323130] py-1.5 rounded transition-colors cursor-pointer"
          >
            <Mail size={12} className="inline mr-1" />
            Email
          </button>
        </div>
      </div>
    </div>
  );
}
