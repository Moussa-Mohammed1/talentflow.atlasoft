export const queryKeys = {
  authMe: ["auth", "me"] as const,
  settings: ["settings"] as const,
  departments: ["departments"] as const,
  resumes: ["resumes"] as const,
  resumeDetail: (id: string | number) => ["resumes", String(id)] as const,
  evaluations: ["evaluations"] as const,
  talents: ["talents"] as const,
  jobOffers: (filters?: Record<string, unknown>) =>
    filters ? (["jobOffers", filters] as const) : (["jobOffers"] as const),
  recruitments: (filters?: Record<string, unknown>) =>
    filters ? (["recruitments", filters] as const) : (["recruitments"] as const),
  adminUsers: ["admin", "users"] as const,
  invitations: ["invitations"] as const,
  activities: ["activities"] as const,
};
