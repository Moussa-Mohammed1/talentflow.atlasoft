import api from "@/lib/axios";
import type { JobOffer } from "@/types/job-offers";

export type JobOfferUpdatePayload = Partial<Pick<JobOffer, "title" | "description" | "responsibilities" | "employment_type" | "work_mode" | "seniority_level" | "status" | "openings" | "publish_date" | "closing_date" | "department_id">>;

export const jobOffersService = {
  async list(): Promise<JobOffer[]> {
    const response = await api.get<JobOffer[]>("/job-offers");
    return response.data;
  },

  async getById(id: string): Promise<JobOffer> {
    const response = await api.get<JobOffer>(`/job-offers/${id}`);
    return response.data;
  },

  async update(id: string, data: JobOfferUpdatePayload): Promise<JobOffer> {
    const response = await api.patch<JobOffer>(`/job-offers/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/job-offers/${id}`);
  },

  async generateFromDescription(description: string): Promise<JobOffer> {
    const response = await api.post<JobOffer>("/job-offers/generate", { description });
    return response.data;
  },
};
