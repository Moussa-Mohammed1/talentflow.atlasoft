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
      
      const analyzeResponse = await api.post<ResumeAnalysisResult>(
        "/resumes/analyze",
        {
          path: uploadResponse.data.path
        }
      )
      setAnalysisResult(analyzeResponse.data);
      setStatus("success");
      return {
        identity: identityResponse.data,
        analysis: analyzeResponse.data,
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
    setError(null);
    setStatus("idle");
  };

  return {
    loading,
    result: identityResult,
    identityResult,
    analysisResult,
    error,
    status,
    importResume,
    reset,
  };
}
