import api from "@/lib/axios";

export interface DocumentListItem {
  id: string;
  name: string;
  candidateName: string;
  role: string;
  importDate: string;
  fileSize: string;
  category: string;
  previewUrl: string | null;
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
