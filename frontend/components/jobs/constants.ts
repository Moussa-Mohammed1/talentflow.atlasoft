import type { AppLanguage } from "@/locales/translations";
import type { EmploymentType, JobOfferStatus, SeniorityLevel, WorkMode } from "@/types/job-offers";

export const employmentTypeLabelsByLang: Record<AppLanguage, Record<EmploymentType, string>> = {
  fr: {
    full_time: "Temps plein",
    part_time: "Temps partiel",
    internship: "Stage",
    contract: "CDD",
    freelance: "Freelance",
  },
  en: {
    full_time: "Full-time",
    part_time: "Part-time",
    internship: "Internship",
    contract: "Contract",
    freelance: "Freelance",
  },
};

export const workModeLabelsByLang: Record<AppLanguage, Record<WorkMode, string>> = {
  fr: {
    on_site: "Sur site",
    hybrid: "Hybride",
    remote: "Télétravail",
  },
  en: {
    on_site: "On-site",
    hybrid: "Hybrid",
    remote: "Remote",
  },
};

export const seniorityLevelLabelsByLang: Record<AppLanguage, Record<SeniorityLevel, string>> = {
  fr: {
    junior: "Junior",
    mid: "Confirmé",
    senior: "Senior",
    lead: "Lead",
  },
  en: {
    junior: "Junior",
    mid: "Mid-level",
    senior: "Senior",
    lead: "Lead",
  },
};

export const statusLabelsByLang: Record<AppLanguage, Record<JobOfferStatus, string>> = {
  fr: {
    draft: "Brouillon",
    published: "Publiée",
    closed: "Fermée",
    archived: "Archivée",
  },
  en: {
    draft: "Draft",
    published: "Published",
    closed: "Closed",
    archived: "Archived",
  },
};

export const employmentTypeLabels = employmentTypeLabelsByLang.fr;
export const workModeLabels = workModeLabelsByLang.fr;
export const seniorityLevelLabels = seniorityLevelLabelsByLang.fr;
export const statusLabels = statusLabelsByLang.fr;

export const seniorityBadgeColors: Record<SeniorityLevel, string> = {
  junior: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
  mid: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300",
  senior: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
  lead: "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300",
};

export const statusColors: Record<JobOfferStatus, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  closed: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  archived: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
};

export function formatDate(dateStr: string | null, locale = "fr-FR"): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
}
