"use client";

import { useCallback, useEffect, useMemo } from "react";

import { jobService } from "@/services/job.service";
import { useAuthStore } from "@/stores/auth.store";
import { useJobStore } from "@/stores/job.store";
import type { JobListResponse } from "@/types/job";

function userIdFromToken(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(normalized)) as { sub?: string };
    const userId = Number(decoded.sub);
    return Number.isInteger(userId) ? userId : null;
  } catch {
    return null;
  }
}

export function useJobs() {
  const authUser = useAuthStore((state) => state.user);
  const authToken = useAuthStore((state) => state.token);
  const jobs = useJobStore((state) => state.jobs);
  const runningCount = useJobStore((state) => state.runningCount);
  const isLoading = useJobStore((state) => state.isLoading);
  const error = useJobStore((state) => state.error);
  const hydrate = useJobStore((state) => state.hydrate);
  const setLoading = useJobStore((state) => state.setLoading);
  const setError = useJobStore((state) => state.setError);

  const token = useMemo(
    () => authToken || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null),
    [authToken],
  );
  const recruiterId = authUser?.id ?? userIdFromToken(token);

  useEffect(() => {
    if (!token || !recruiterId) return;
    let cancelled = false;

    setLoading(true);
    jobService
      .list()
      .then((response: JobListResponse) => {
        if (!cancelled) hydrate(response.items, response.running_count);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load background jobs.");
      });

    return () => {
      cancelled = true;
    };
  }, [hydrate, recruiterId, setError, setLoading, token]);

  const refresh = useCallback(async () => {
    if (!token || !recruiterId) return;
    setLoading(true);
    try {
      const response = await jobService.list();
      hydrate(response.items, response.running_count);
    } catch {
      setError("Unable to refresh jobs.");
    }
  }, [hydrate, recruiterId, setError, setLoading, token]);

  return { jobs, runningCount, isLoading, error, refresh };
}