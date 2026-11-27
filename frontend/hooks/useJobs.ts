"use client";

import { useCallback, useEffect } from "react";

import { jobService } from "@/services/job.service";
import { useAuthStore } from "@/stores/auth.store";
import { useJobStore } from "@/stores/job.store";
import { useLanguage } from "@/context/LanguageContext";
import type { JobListResponse } from "@/types/job";

export function useJobs() {
  const { l } = useLanguage();
  const authUser = useAuthStore((state) => state.user);
  const jobs = useJobStore((state) => state.jobs);
  const runningCount = useJobStore((state) => state.runningCount);
  const isLoading = useJobStore((state) => state.isLoading);
  const error = useJobStore((state) => state.error);
  const hydrate = useJobStore((state) => state.hydrate);
  const setLoading = useJobStore((state) => state.setLoading);
  const setError = useJobStore((state) => state.setError);

  const recruiterId = authUser?.id ?? null;

  useEffect(() => {
    if (!recruiterId) return;
    let cancelled = false;

    setLoading(true);
    jobService
      .list()
      .then((response: JobListResponse) => {
        if (!cancelled) hydrate(response.items, response.running_count);
      })
      .catch(() => {
        if (!cancelled) setError(l("Impossible de charger les tâches de fond.", "Failed to load background tasks."));
      });

    return () => {
      cancelled = true;
    };
  }, [hydrate, l, recruiterId, setError, setLoading]);

  // Fallback polling while background jobs are active so UI stays current even if WS drops.
  useEffect(() => {
    if (!recruiterId || runningCount <= 0) return;

    const timer = setInterval(() => {
      jobService
        .list()
        .then((response: JobListResponse) => {
          hydrate(response.items, response.running_count);
        })
        .catch(() => {
          // Non-fatal fallback; WebSocket or next poll recovers.
        });
    }, 3_000);

    return () => clearInterval(timer);
  }, [hydrate, recruiterId, runningCount]);

  const deleteAll = useCallback(async () => {
    if (!recruiterId) return;
    try {
      await jobService.deleteAll();
      hydrate([], 0);
    } catch {
      setError(l("Impossible de supprimer toutes les tâches.", "Failed to delete all tasks."));
    }
  }, [hydrate, l, recruiterId, setError]);

  const refresh = useCallback(async () => {
    if (!recruiterId) return;
    setLoading(true);
    try {
      const response = await jobService.list();
      hydrate(response.items, response.running_count);
    } catch {
      setError(l("Impossible d'actualiser les tâches.", "Failed to refresh tasks."));
    }
  }, [hydrate, l, recruiterId, setError, setLoading]);

  return { jobs, runningCount, isLoading, error, refresh, deleteAll };
}
