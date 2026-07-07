export type RecruitmentStatus =
  | "pending"
  | "interview_invitation_sent"
  | "interview_confirmed"
  | "interview_completed"
  | "offer_sent"
  | "offer_accepted"
  | "offer_rejected"
  | "candidate_declined"
  | "hired"
  | "cancelled";

export type RecruitmentPriority = "low" | "medium" | "high";

export type InterviewType = "online" | "phone" | "onsite";

export type InterviewStatus = "scheduled" | "completed" | "cancelled" | "rescheduled";

export type EmailType = "interview_invitation" | "reminder" | "offer" | "rejection" | "custom";

export type EmailStatus = "draft" | "queued" | "sent" | "failed";

export interface RecruitmentListItem {
  id: string;
  candidate_id: number;
  job_offer_id: string;
  compatibility_score: number | null;
  status: RecruitmentStatus;
  priority: RecruitmentPriority;
  assigned_recruiter_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  candidate: {
    id: number;
    fullname: string;
    email: string;
    phone: string;
    photo: string | null;
  } | null;
  job_offer: {
    id: string;
    title: string;
  } | null;
  assigned_recruiter: {
    id: number;
    fullname: string;
  } | null;
}

export interface RecruitmentListResponse {
  items: RecruitmentListItem[];
  total: number;
}

export interface CandidateInfo {
  id: number;
  fullname: string;
  email: string;
  phone: string;
  photo: string | null;
}

export interface JobOfferInfo {
  id: string;
  title: string;
  description: string | null;
  department_id: number | null;
}

export interface Interview {
  id: string;
  recruitment_id: string;
  title: string;
  interview_type: InterviewType;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  interviewer_name: string | null;
  status: InterviewStatus;
  feedback: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface RecruitmentEmail {
  id: string;
  recruitment_id: string;
  email_type: EmailType;
  sender_email: string;
  recipient_email: string;
  subject: string;
  body: string;
  status: EmailStatus;
  provider_message_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface RecruitmentDetail {
  recruitment: {
    id: string;
    candidate_id: number;
    job_offer_id: string;
    compatibility_score: number | null;
    status: RecruitmentStatus;
    priority: RecruitmentPriority;
    assigned_recruiter_id: number | null;
    created_by: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  candidate: CandidateInfo | null;
  job_offer: JobOfferInfo | null;
  interviews: Interview[];
  emails: RecruitmentEmail[];
}

export interface RecruitmentCreateRequest {
  candidate_id: number;
  job_offer_id: string;
  priority: RecruitmentPriority;
  notes?: string;
}

export interface RecruitmentUpdateRequest {
  status?: RecruitmentStatus;
  priority?: RecruitmentPriority;
  assigned_recruiter_id?: number | null;
  notes?: string;
}

export interface InterviewCreateRequest {
  title: string;
  interview_type: InterviewType;
  scheduled_at: string;
  duration_minutes: number;
  location?: string | null;
  interviewer_name?: string | null;
}

export interface EmailPreviewRequest {
  interview_date: string;
  interview_time: string;
  duration_minutes: number;
  location?: string | null;
  recruiter_name: string;
  company_name: string;
  language?: string;
}

export interface EmailPreviewResponse {
  subject: string;
  body: string;
}

export interface SendEmailRequest {
  subject: string;
  body: string;
}

export const statusLabels: Record<RecruitmentStatus, string> = {
  pending: "En attente",
  interview_invitation_sent: "Invitation envoyée",
  interview_confirmed: "Entretien confirmé",
  interview_completed: "Entretien terminé",
  offer_sent: "Offre envoyée",
  offer_accepted: "Offre acceptée",
  offer_rejected: "Offre refusée",
  candidate_declined: "Candidat décliné",
  hired: "Embauché",
  cancelled: "Annulé",
};

export const statusColors: Record<RecruitmentStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  interview_invitation_sent: "bg-blue-50 text-blue-600",
  interview_confirmed: "bg-indigo-50 text-indigo-600",
  interview_completed: "bg-purple-50 text-purple-600",
  offer_sent: "bg-amber-50 text-amber-600",
  offer_accepted: "bg-emerald-50 text-emerald-600",
  offer_rejected: "bg-red-50 text-red-600",
  candidate_declined: "bg-red-50 text-red-600",
  hired: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export const priorityLabels: Record<RecruitmentPriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

export const priorityColors: Record<RecruitmentPriority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-amber-50 text-amber-600",
  high: "bg-red-50 text-red-600",
};
