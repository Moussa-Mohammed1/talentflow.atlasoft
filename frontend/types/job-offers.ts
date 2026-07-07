export type EmploymentType = "full_time" | "part_time" | "internship" | "contract" | "freelance";
export type WorkMode = "on_site" | "hybrid" | "remote";
export type SeniorityLevel = "junior" | "mid" | "senior" | "lead";
export type JobOfferStatus = "draft" | "published" | "closed" | "archived";

export interface JobOffer {
  id: string;
  title: string;
  description: string | null;
  responsibilities: string | null;
  department_id: number | null;
  employment_type: EmploymentType;
  work_mode: WorkMode;
  seniority_level: SeniorityLevel;
  status: JobOfferStatus;
  openings: number;
  publish_date: string | null;
  closing_date: string | null;
  created_at: string;
}
