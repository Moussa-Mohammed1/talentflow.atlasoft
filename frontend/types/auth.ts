export interface LLMUsageByAction {
  action: string;
  count: number;
}

export interface UserStats {
  resume_count: number;
  successful_llm_requests: number;
  llm_usage_by_action: LLMUsageByAction[];
  invitations_sent: number;
  invitations_accepted: number;
  invitations_refused: number;
}
