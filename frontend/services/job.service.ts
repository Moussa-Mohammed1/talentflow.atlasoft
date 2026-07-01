import api from "@/lib/axios";
import type { Job, JobListResponse, JobCreateRequest, JobStatusUpdate } from "@/types/job";

export const jobService = {
  async list(limit = 50, offset = 0): Promise<JobListResponse> {
    const response = await api.get<JobListResponse>("/jobs", {
      params: { limit, offset },
    });
    return response.data;
  },

  async create(data: JobCreateRequest): Promise<Job> {
    const response = await api.post<Job>("/jobs", data);
    return response.data;
  },

  async updateStatus(jobId: number, update: JobStatusUpdate): Promise<Job> {
    const response = await api.patch<Job>(`/jobs/${jobId}/status`, update);
    return response.data;
  },

  async start(jobId: number, message?: string): Promise<Job> {
    const response = await api.post<Job>(`/jobs/${jobId}/start`, null, {
      params: { message },
    });
    return response.data;
  },

  async complete(jobId: number, message?: string): Promise<Job> {
    const response = await api.post<Job>(`/jobs/${jobId}/complete`, null, {
      params: { message },
    });
    return response.data;
  },

  async fail(jobId: number, message?: string): Promise<Job> {
    const response = await api.post<Job>(`/jobs/${jobId}/fail`, null, {
      params: { message },
    });
    return response.data;
  },
};