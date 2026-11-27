import { useState } from "react";
import api from "@/lib/axios";
import { jobService } from "@/services/job.service";
import { analyzeResumeAsync } from "@/services/resume.service";
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
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
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
      setProgress(0);
      setCurrentStep(null);
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
      setProgress(5);
      setCurrentStep(l("En file d'attente...", "Queued..."));
      toast.success(l("L'analyse a commencé", "Analysis started"));

      const acceptedJob = await analyzeResumeAsync(uploadResponse.data.path);
      const completedJob = await jobService.waitForJob(acceptedJob.job_id, {
        onProgress: (job) => {
          setProgress(job.progress ?? 0);
          setCurrentStep(job.message || job.current_step || null);
        },
      });

      const payloadAnalysis = completedJob.result_payload?.analysis as
        | ResumeFullAnalysisResult["analysis"]
        | undefined;
      const resolvedAnalysis: ResumeFullAnalysisResult = {
        analysis: payloadAnalysis ?? {
          sections: [],
          technologies: [],
          competencies: [],
          skills_by_category: {},
          flattened_skills: [],
        },
      };

      toast.success(
        l(
          "L'analyse complète du CV importé est terminée",
          "Full analysis of the uploaded resume is complete"
        )
      );
      setProgress(100);
      setAnalysisResult(resolvedAnalysis);
      setStatus("success");
      return {
        identity: identityResponse.data,
        analysis: resolvedAnalysis,
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
    setProgress(0);
    setCurrentStep(null);
  };

  return {
    loading,
    result: identityResult,
    identityResult,
    analysisResult,
    error,
    status,
    progress,
    currentStep,
    importResume,
    reset,
  };
}
