export type JobType =
  | "identity_extraction"
  | "resume_screening"
  | "language_extraction"
  | "bulk_export"
  | "skill_extraction"
  | "experience_extraction"
  | "education_extraction"
  | "candidate_matching";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface Job {
  id: number;
  recruiter_id: number;
  type: JobType;
  target: string;
  status: JobStatus;
  message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface JobListResponse {
  items: Job[];
  running_count: number;
}

export interface JobCreateRequest {
  type: JobType;
  target: string;
  message?: string;
}

export interface JobStatusUpdate {
  status?: JobStatus;
  message?: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export function formatJobType(type: JobType): string {
  switch (type) {
    case "identity_extraction":
      return "Extraction d'identité";
    case "resume_screening":
      return "Analyse de CV IA";
    case "bulk_export":
      return "Export de données";
    case "skill_extraction":
      return "Extraction de compétences";
    case "experience_extraction":
      return "Extraction d'expériences";
    case "candidate_matching":
      return "Correspondance de candidats";
    case "language_extraction":
      return "Extraction des langues";
    case "education_extraction":
      return "Extraction de formations";
    default:
      return type;
  }
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours} h`;
  if (diffDays < 7) return `il y a ${diffDays} j`;
  return date.toLocaleDateString();
}