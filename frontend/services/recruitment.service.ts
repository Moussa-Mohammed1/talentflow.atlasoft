import api from "@/lib/axios";
import type {
  RecruitmentListResponse,
  RecruitmentDetail,
  RecruitmentCreateRequest,
  RecruitmentUpdateRequest,
  RecruitmentListItem,
  Interview,
  InterviewCreateRequest,
  RecruitmentEmail,
  EmailPreviewRequest,
  EmailPreviewResponse,
  SendEmailRequest,
} from "@/types/recruitment";

export const recruitmentService = {
  async list(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    job_offer_id?: string;
    recruiter_id?: number;
    priority?: string;
    ordering?: string;
  }): Promise<RecruitmentListResponse> {
    const response = await api.get<RecruitmentListResponse>("/recruitments", { params });
    return response.data;
  },

  async getById(id: string): Promise<RecruitmentDetail> {
    const response = await api.get<RecruitmentDetail>(`/recruitments/${id}`);
    return response.data;
  },

  async create(data: RecruitmentCreateRequest): Promise<RecruitmentListItem> {
    const response = await api.post<RecruitmentListItem>("/recruitments", data);
    return response.data;
  },

  async update(id: string, data: RecruitmentUpdateRequest): Promise<RecruitmentListItem> {
    const response = await api.patch<RecruitmentListItem>(`/recruitments/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/recruitments/${id}`);
  },

  async createInterview(recruitmentId: string, data: InterviewCreateRequest): Promise<Interview> {
    const response = await api.post<Interview>(`/recruitments/${recruitmentId}/interviews`, data);
    return response.data;
  },

  async listInterviews(recruitmentId: string): Promise<Interview[]> {
    const response = await api.get<Interview[]>(`/recruitments/${recruitmentId}/interviews`);
    return response.data;
  },

  async updateInterview(interviewId: string, data: Partial<InterviewCreateRequest>): Promise<Interview> {
    const response = await api.patch<Interview>(`/recruitments/interviews/${interviewId}`, data);
    return response.data;
  },

  async deleteInterview(interviewId: string): Promise<void> {
    await api.delete(`/recruitments/interviews/${interviewId}`);
  },

  async previewEmail(recruitmentId: string, data: EmailPreviewRequest): Promise<EmailPreviewResponse> {
    const response = await api.post<EmailPreviewResponse>(`/recruitments/${recruitmentId}/preview-email`, data);
    return response.data;
  },

  async sendEmail(recruitmentId: string, data: SendEmailRequest): Promise<RecruitmentEmail> {
    const response = await api.post<RecruitmentEmail>(`/recruitments/${recruitmentId}/send-email`, data);
    return response.data;
  },

  async listEmails(recruitmentId: string): Promise<RecruitmentEmail[]> {
    const response = await api.get<RecruitmentEmail[]>(`/recruitments/${recruitmentId}/emails`);
    return response.data;
  },
};
