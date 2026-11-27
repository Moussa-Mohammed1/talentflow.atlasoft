"use client";

import { Briefcase, Calendar, MapPin, Users } from "lucide-react";
import type { JobOffer } from "@/types/job-offers";
import { useLanguage } from "@/context/LanguageContext";
import {
  employmentTypeLabelsByLang,
  formatDate,
  seniorityBadgeColors,
  seniorityLevelLabelsByLang,
  workModeLabelsByLang,
} from "./constants";

export function JobOfferCard({ offer, onClick }: { offer: JobOffer; onClick: () => void }) {
  const { language, locale } = useLanguage();
  const publishDate = formatDate(offer.publish_date, locale);
  const closingDate = formatDate(offer.closing_date, locale);
  const employmentTypeLabels = employmentTypeLabelsByLang[language];
  const workModeLabels = workModeLabelsByLang[language];
  const seniorityLevelLabels = seniorityLevelLabelsByLang[language];

  return (
    <button
      type="button"
      onClick={onClick}
      className="mrc border border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423] hover:bg-slate-100 dark:hover:bg-[#323130] p-5 transition-all duration-300 flex flex-col text-left w-full cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#f3f2f1] leading-snug line-clamp-2">
          {offer.title}
        </h3>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="inline-flex items-center gap-1 mm bg-slate-100 dark:bg-[#1b1a19] px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-[#d2d0ce]">
          <Briefcase size={12} />
          {employmentTypeLabels[offer.employment_type]}
        </span>
        <span className="inline-flex items-center gap-1 mm bg-slate-100 dark:bg-[#1b1a19] px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-[#d2d0ce]">
          <MapPin size={12} />
          {workModeLabels[offer.work_mode]}
        </span>
        <span
          className={`inline-flex items-center gap-1 mm px-2 py-0.5 text-[11px] font-medium ${seniorityBadgeColors[offer.seniority_level]}`}
        >
          <Users size={12} />
          {seniorityLevelLabels[offer.seniority_level]}
        </span>
      </div>

      {offer.description && (
        <p className="text-xs text-slate-500 dark:text-[#a19f9d] leading-relaxed line-clamp-3 mb-3">
          {offer.description}
        </p>
      )}

      {(publishDate || closingDate) && (
        <div className="mt-auto flex items-center gap-3 text-[11px] text-slate-400 dark:text-[#8a8886]">
          {publishDate && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {publishDate}
            </span>
          )}
          {closingDate && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {closingDate}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
