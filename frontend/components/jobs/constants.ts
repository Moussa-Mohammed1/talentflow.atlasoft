import type { EmploymentType, JobOfferStatus, SeniorityLevel, WorkMode } from "@/types/job-offers";

export const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: "Temps plein",
  part_time: "Temps partiel",
  internship: "Stage",
  contract: "CDD",
  freelance: "Freelance",
};

export const workModeLabels: Record<WorkMode, string> = {
  on_site: "Sur site",
  hybrid: "Hybride",
  remote: "Télétravail",
};

export const seniorityLevelLabels: Record<SeniorityLevel, string> = {
  junior: "Junior",
  mid: "Confirmé",
  senior: "Senior",
  lead: "Lead",
};

export const seniorityBadgeColors: Record<SeniorityLevel, string> = {
  junior: "bg-emerald-50 text-emerald-600",
  mid: "bg-blue-50 text-blue-600",
  senior: "bg-amber-50 text-amber-600",
  lead: "bg-purple-50 text-purple-600",
};

export const statusLabels: Record<JobOfferStatus, string> = {
  draft: "Brouillon",
  published: "Publiée",
  closed: "Fermée",
  archived: "Archivée",
};

export const statusColors: Record<JobOfferStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-emerald-50 text-emerald-600",
  closed: "bg-red-50 text-red-600",
  archived: "bg-amber-50 text-amber-600",
};

export function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
}
