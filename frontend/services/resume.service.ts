import api from "@/lib/axios";
import { ResumeDetails } from "@/components/resume/DocumentResumeInfos";

export interface DocumentListItem {
  id: string;
  name: string;
  candidateName: string;
  role: string;
  importDate: string;
  fileSize: string;
  category: string;
  previewUrl: string | null;
  recruiter_id: number;
  recruiter_name: string;
}

function resolvePreviewRequestUrl(previewUrl: string | null) {
  if (!previewUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(previewUrl)) {
    return previewUrl;
  }

  return previewUrl.replace(/^\/api(?=\/)/, "");
}

async function resolvePreviewUrl(previewUrl: string | null) {
  const previewRequestUrl = resolvePreviewRequestUrl(previewUrl);

  if (!previewRequestUrl) {
    return null;
  }

  try {
    const response = await api.get<Blob>(previewRequestUrl, {
      responseType: "blob",
    });

    return URL.createObjectURL(response.data);
  } catch {
    return null;
  }
}

export function revokeResumeDocumentPreviews(documents: DocumentListItem[]) {
  documents.forEach((document) => {
    if (document.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(document.previewUrl);
    }
  });
}

export async function getResumeDocuments() {
  const response = await api.get<DocumentListItem[]>("/resumes/");
  
  return Promise.all(
    response.data.map(async (document) => ({
      ...document,
      previewUrl: await resolvePreviewUrl(document.previewUrl),
    }))
  );
}

export async function getResumeDetails(id: string): Promise<ResumeDetails> {
  const response = await api.get<ResumeDetails>(`/resumes/${id}`);
  return response.data;
}

export async function reanalyzeIdentity(resumeId: number) {
  const response = await api.post(`/resumes/${resumeId}/reanalyze-identity`);
  return response.data;
}

export interface ReanalyzeAllResponse {
  raw_text: string;
  analysis: {
    sections: unknown[];
    technologies: unknown[];
    competencies: unknown[];
    skills_by_category: Record<string, unknown[]>;
    flattened_skills: string[];
  };
  experience: {
    sections: unknown[];
    experiences: unknown[];
    stats: Record<string, unknown>;
  };
}

export async function reanalyzeAll(resume_id: number): Promise<ReanalyzeAllResponse> {
  const response = await api.post<ReanalyzeAllResponse>("/resumes/re-analyze", {
    resume_id: resume_id,
  });
  return response.data;
}

export interface UpdateCandidatPayload {
  fullname?: string;
  email?: string;
  phone?: string;
}

export async function updateCandidat(resumeId: number, data: UpdateCandidatPayload) {
  const response = await api.patch(`/resumes/${resumeId}/candidat`, data);
  return response.data;
}

export interface UpdateExperiencePayload {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

export async function updateExperience(experienceId: number, data: UpdateExperiencePayload) {
  const response = await api.patch(`/resumes/experience/${experienceId}`, data);
  return response.data;
}

export interface UpdateEducationPayload {
  institution?: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export async function updateEducation(educationId: number, data: UpdateEducationPayload) {
  const response = await api.patch(`/resumes/education/${educationId}`, data);
  return response.data;
}

export interface UpdateCertificationPayload {
  name?: string;
  organization?: string;
  issue_date?: string;
  expiration_date?: string;
  credential_id?: string;
  credential_url?: string;
  description?: string;
}

export async function updateCertification(certificationId: number, data: UpdateCertificationPayload) {
  const response = await api.patch(`/resumes/certification/${certificationId}`, data);
  return response.data;
}

export async function deleteResume(resumeId: number) {
  const response = await api.delete(`/resumes/${resumeId}`);
  return response.data;
}
