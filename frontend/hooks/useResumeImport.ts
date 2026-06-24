import { useState } from "react";
import api from "@/lib/axios";
export type ImportStatus =
  | "idle"
  | "uploading"
  | "uploaded"
  | "analyzing"
  | "extracting"
  | "success"
  | "error";

export interface ResumeIdentityResult {
  name?: {
    full_name?: string;
    confidence?: number;
    score?: number;
  };
  email?: {
    value?: string;
    confidence?: number;
    evidence?: string[];
  };
  phone?: {
    value?: string;
    confidence?: number;
    evidence?: string[];
  };
  stats?: Record<string, unknown>;
}

export interface ResumeAnalysisResult {
  raw_text?: string;
  analysis?: {
    sections?: unknown[];
    technologies?: unknown[];
    competencies?: unknown[];
    skills_by_category?: Record<string, unknown[]>;
    flattened_skills?: string[];
  };
}

export interface ResumeExperienceResult {
  raw_text?: string;
  analysis?: {
    sections?: unknown[];
    experiences?: Array<{
      title: string;
      description?: string | null;
      start_date: string;
      end_date?: string | null;
      confidence: number;
      section: string;
      evidence: string[];
    }>;
    stats?: Record<string, unknown>;
  };
}

interface ImportResumeParams {
  file: File;
}

interface UploadResponse {
  path: string;
  id: number;
  recruiter_id: number;
  created_at: string;
}

export function useResumeImport() {
  const [loading, setLoading] = useState(false);
  const [identityResult, setIdentityResult] = useState<ResumeIdentityResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [experienceResult, setExperienceResult] = useState<ResumeExperienceResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const importResume = async ({
    file,
  }: ImportResumeParams) => {
    try {
      setLoading(true);
      setError(null);
      setIdentityResult(null);
      setAnalysisResult(null);
      setExperienceResult(null);
      setStatus("uploading");

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse =
        await api.post<UploadResponse>(
          "/resumes/upload",
          formData
        );

      setStatus("uploaded");

      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );

      setStatus("extracting");

      const identityResponse = await api.post<ResumeIdentityResult>(
        "/resumes/identity",
        {
          path: uploadResponse.data.path,
        }
      );

      setIdentityResult(identityResponse.data);

      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
      setStatus("analyzing")
      
      const [analyzeResponse, experienceResponse] = await Promise.all([
        api.post<ResumeAnalysisResult>("/resumes/analyze", {
          path: uploadResponse.data.path,
        }),
        api.post<ResumeExperienceResult>("/resumes/experience", {
          path: uploadResponse.data.path,
        }),
      ]);
      setAnalysisResult(analyzeResponse.data);
      setExperienceResult(experienceResponse.data);
      setStatus("success");
      return {
        identity: identityResponse.data,
        analysis: analyzeResponse.data,
        experience: experienceResponse.data,
      };
    } catch (err) {
      setStatus("error");
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setIdentityResult(null);
    setAnalysisResult(null);
    setExperienceResult(null);
    setError(null);
    setStatus("idle");
  };

  return {
    loading,
    result: identityResult,
    identityResult,
    analysisResult,
    experienceResult,
    error,
    status,
    importResume,
    reset,
  };
}
