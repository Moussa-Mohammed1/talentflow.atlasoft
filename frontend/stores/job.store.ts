import { create } from "zustand";

import type { Job } from "@/types/job";

interface JobState {
  jobs: Job[];
  runningCount: number;
  isLoading: boolean;
  error: string | null;
  hydrate: (jobs: Job[], runningCount: number) => void;
  upsertJob: (job: Job) => void;
  updateJob: (job: Job) => void;
  addJob: (job: Job) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const isActiveJob = (job: Job) => job.status === "running" || job.status === "pending";

function mergeJobs(existing: Job[], incoming: Job): { jobs: Job[]; runningCount: number } {
  const exists = existing.some((item) => item.id === incoming.id);
  const nextJobs = exists
    ? existing.map((item) => (item.id === incoming.id ? incoming : item))
    : [incoming, ...existing].slice(0, 100);
  return {
    jobs: nextJobs,
    runningCount: nextJobs.filter(isActiveJob).length,
  };
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  runningCount: 0,
  isLoading: false,
  error: null,

  hydrate: (jobs, runningCount) =>
    set({ jobs, runningCount, isLoading: false, error: null }),

  upsertJob: (job) => set((state) => mergeJobs(state.jobs, job)),

  updateJob: (job) => set((state) => mergeJobs(state.jobs, job)),

  addJob: (job) => set((state) => mergeJobs(state.jobs, job)),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set({ jobs: [], runningCount: 0, isLoading: false, error: null }),
}));