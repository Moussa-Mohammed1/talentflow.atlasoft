import { useState } from "react";
import api from "@/lib/axios";
import { useToast } from "./useToast";
import { useLanguage } from "@/context/LanguageContext";

export type ImportStatus =
  | "idle"
  | "uploading"
  | "uploaded"
  | "extracting"
  | "analyzing"
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
  photo?: string | null;
  stats?: Record<string, unknown>;
}

export interface ResumeFullAnalysisResult {
  raw_text?: string;
  analysis?: {
    sections?: unknown[];
    technologies?: unknown[];
    competencies?: unknown[];
    skills_by_category?: Record<string, unknown[]>;
    flattened_skills?: string[];
  };
  experience?: {
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
  const [analysisResult, setAnalysisResult] = useState<ResumeFullAnalysisResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const toast = useToast();
  const { l } = useLanguage();

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
      setStatus("analyzing");
      toast.success(l("L'analyse a commencé", "Analysis started"));
      const analyzeResponse = await api.post<ResumeFullAnalysisResult>(
        "/resumes/analyze",
        {
          path: uploadResponse.data.path,
        }
      );
      toast.success(
        l(
          "L'analyse complète du CV importé est terminée",
          "Full analysis of the uploaded resume is complete"
        )
      );
      setAnalysisResult(analyzeResponse.data);
      setStatus("success");
      return {
        identity: identityResponse.data,
        analysis: analyzeResponse.data,
      };
    } catch (err) {
      setStatus("error");
      toast.error(
        l(
          "Une erreur est survenue lors de l'extraction du CV",
          "An error occurred while extracting the resume"
        )
      );
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
