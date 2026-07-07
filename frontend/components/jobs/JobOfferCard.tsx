import { Briefcase, Calendar, MapPin, Users } from "lucide-react";
import type { JobOffer } from "@/types/job-offers";
import {
  employmentTypeLabels,
  formatDate,
  seniorityBadgeColors,
  seniorityLevelLabels,
  workModeLabels,
} from "./constants";

export function JobOfferCard({ offer, onClick }: { offer: JobOffer; onClick: () => void }) {
  const publishDate = formatDate(offer.publish_date);
  const closingDate = formatDate(offer.closing_date);

  return (
    <button
      type="button"
      onClick={onClick}
      className="mrc border border-slate-100 bg-white hover:bg-slate-100 p-5  transition-all duration-300 flex flex-col text-left w-full cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
          {offer.title}
        </h3>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="inline-flex items-center gap-1 rounded-sm bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          <Briefcase size={12} />
          {employmentTypeLabels[offer.employment_type]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-sm bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          <MapPin size={12} />
          {workModeLabels[offer.work_mode]}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium ${seniorityBadgeColors[offer.seniority_level]}`}
        >
          <Users size={12} />
          {seniorityLevelLabels[offer.seniority_level]}
        </span>
      </div>

      {offer.description && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3">
          {offer.description}
        </p>
      )}

      {(publishDate || closingDate) && (
        <div className="mt-auto flex items-center gap-3 text-[11px] text-slate-400">
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
