import { beforeEach, describe, expect, it } from "vitest";
import { useJobStore } from "@/stores/job.store";
import { formatJobType, type Job } from "@/types/job";

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: 1,
  recruiter_id: 7,
  type: "resume_screening",
  target: "cv.pdf",
  status: "pending",
  message: "Task queued",
  celery_task_id: "celery-1",
  queue_name: "cv_parsing",
  progress: 0,
  current_step: "queued",
  retries: 0,
  max_retries: 3,
  error_details: null,
  result_payload: null,
  started_at: null,
  completed_at: null,
  created_at: "2026-11-27T20:00:00Z",
  updated_at: "2026-11-27T20:00:00Z",
  ...overrides,
});

describe("useJobStore real-time job updates", () => {
  beforeEach(() => {
    useJobStore.getState().reset();
  });

  it("upserts new jobs, tracks runningCount across pending/running, and reflects failures", () => {
    const queued = makeJob({ id: 10, status: "pending", progress: 0 });
    useJobStore.getState().upsertJob(queued);

    expect(useJobStore.getState().jobs).toHaveLength(1);
    expect(useJobStore.getState().runningCount).toBe(1);

    const running = makeJob({
      id: 10,
      status: "running",
      progress: 50,
      current_step: "extracting_experiences",
      retries: 1,
    });
    useJobStore.getState().upsertJob(running);

    expect(useJobStore.getState().jobs).toHaveLength(1);
    expect(useJobStore.getState().jobs[0].progress).toBe(50);
    expect(useJobStore.getState().jobs[0].retries).toBe(1);
    expect(useJobStore.getState().runningCount).toBe(1);

    const secondJob = makeJob({
      id: 11,
      type: "job_offer_generation",
      status: "running",
      progress: 30,
      queue_name: "ai_workflows",
    });
    useJobStore.getState().upsertJob(secondJob);
    expect(useJobStore.getState().runningCount).toBe(2);

    const failed = makeJob({
      id: 10,
      status: "failed",
      progress: 50,
      error_details: "LLM rate limit",
    });
    useJobStore.getState().upsertJob(failed);

    expect(useJobStore.getState().runningCount).toBe(1);
    expect(useJobStore.getState().jobs.find((j) => j.id === 10)?.error_details).toBe("LLM rate limit");
  });

  it("formats new Phase 2 job types in FR and EN", () => {
    expect(formatJobType("job_offer_generation", "fr")).toBe("Génération d'offre IA");
    expect(formatJobType("job_offer_generation", "en")).toBe("AI job offer generation");
    expect(formatJobType("certification_extraction", "en")).toBe("Certification extraction");
    expect(formatJobType("evaluation_validation", "fr")).toBe("Validation d'évaluation");
  });
});
