import api from "@/lib/axios";
import { useJobStore } from "@/stores/job.store";
import type { Job, JobListResponse, JobCreateRequest, JobStatusUpdate } from "@/types/job";

export interface WaitForJobOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  onProgress?: (job: Job) => void;
}

export const jobService = {
  async list(limit = 50, offset = 0): Promise<JobListResponse> {
    const response = await api.get<JobListResponse>("/jobs", {
      params: { limit, offset },
    });
    return response.data;
  },

  async getById(jobId: number): Promise<Job> {
    const response = await api.get<Job>(`/jobs/${jobId}`);
    useJobStore.getState().upsertJob(response.data);
    return response.data;
  },

  async waitForJob(jobId: number, options: WaitForJobOptions = {}): Promise<Job> {
    const { pollIntervalMs = 2000, timeoutMs = 300_000, onProgress } = options;
    const startedAt = Date.now();

    return new Promise<Job>((resolve, reject) => {
      let settled = false;
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let unsubscribe: (() => void) | null = null;

      const cleanup = () => {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };

      const handleUpdate = (job: Job) => {
        if (settled) return;
        onProgress?.(job);
        if (job.status === "completed") {
          settled = true;
          cleanup();
          resolve(job);
        } else if (job.status === "failed") {
          settled = true;
          cleanup();
          reject(new Error(job.error_details || job.message || "Background job failed"));
        }
      };

      const pollOnce = async () => {
        if (settled) return;
        if (Date.now() - startedAt > timeoutMs) {
          settled = true;
          cleanup();
          reject(new Error("Timed out waiting for background job"));
          return;
        }
        try {
          const latest = await jobService.getById(jobId);
          handleUpdate(latest);
        } catch {
          // Keep polling on transient network errors until timeout.
        }
      };

      unsubscribe = useJobStore.subscribe((state) => {
        const match = state.jobs.find((item) => item.id === jobId);
        if (match) handleUpdate(match);
      });

      const current = useJobStore.getState().jobs.find((item) => item.id === jobId);
      if (current) {
        handleUpdate(current);
        if (settled) return;
      }

      pollTimer = setInterval(() => {
        void pollOnce();
      }, pollIntervalMs);
      void pollOnce();
    });
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

  async deleteAll(): Promise<{ deleted: number }> {
    const response = await api.delete<{ deleted: number }>("/jobs");
    return response.data;
  },
};