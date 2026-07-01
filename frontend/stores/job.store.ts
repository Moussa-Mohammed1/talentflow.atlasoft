import { create } from "zustand";

import type { Job } from "@/types/job";

interface JobState {
  jobs: Job[];
  runningCount: number;
  isLoading: boolean;
  error: string | null;
  hydrate: (jobs: Job[], runningCount: number) => void;
  updateJob: (job: Job) => void;
  addJob: (job: Job) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  runningCount: 0,
  isLoading: false,
  error: null,

  hydrate: (jobs, runningCount) =>
    set({ jobs, runningCount, isLoading: false, error: null }),

  updateJob: (job) =>
    set((state) => ({
      jobs: state.jobs.map((item) => (item.id === job.id ? job : item)),
      runningCount: state.jobs.filter((j) => j.id !== job.id && j.status === "running").length + (job.status === "running" ? 1 : 0),
    })),

  addJob: (job) =>
    set((state) => ({
      jobs: [job, ...state.jobs].slice(0, 100),
      runningCount: job.status === "running" ? state.runningCount + 1 : state.runningCount,
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set({ jobs: [], runningCount: 0, isLoading: false, error: null }),
}));