"use client";

import { useQuery } from "@tanstack/react-query";
import { AuthService } from "@/services/auth.service";
import { SettingsService } from "@/services/settings.service";
import { DepartmentService } from "@/services/department.service";
import { getResumeDocuments } from "@/services/resume.service";
import { queryKeys } from "@/lib/query-keys";

export function useAuthMeQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.authMe,
    queryFn: () => AuthService.me(),
    enabled,
  });
}

export function useSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => SettingsService.get(),
    enabled,
  });
}

export function useDepartmentsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.departments,
    queryFn: () => DepartmentService.list(),
    enabled,
  });
}

export function useResumesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.resumes,
    queryFn: () => getResumeDocuments(),
    enabled,
  });
}
