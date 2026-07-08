export interface AdminUser {
  id: number;
  fullname: string;
  email: string;
  avatar: string | null;
  role: string;
  is_active: boolean;
  created_at: string | null;
  resume_count: number;
  successful_llm_requests: number;
}
