export interface Activity {
  id: number;
  type: "resume_analyzed" | "invitation_accepted" | "invitation_refused";
  description: string;
  candidate_name?: string;
  recruiter_name?: string;
  invited_name?: string;
  created_at: string;
}
