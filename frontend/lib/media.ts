const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
const API_ORIGIN = RAW_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

/**
 * Resolve any backend media path ("candidate_photos/x.jpg", "/storage/avatars/x.png",
 * "/api/files/avatars/x.png", or absolute URL) into an authenticated API file URL.
 * Prefers same-origin `/api/files/...` in browser so HttpOnly session cookies apply.
 */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/storage/")) {
        const key = parsed.pathname.slice("/storage/".length);
        return typeof window !== "undefined" ? `/api/files/${key}` : `${API_ORIGIN}/api/files/${key}`;
      }
      if (parsed.pathname.startsWith("/api/files/")) {
        return typeof window !== "undefined" ? parsed.pathname : trimmed;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  let cleaned = trimmed.replace(/\\/g, "/").replace(/^\/+/, "");
  if (cleaned.startsWith("api/files/")) {
    cleaned = cleaned.slice("api/files/".length);
  } else if (cleaned.startsWith("storage/")) {
    cleaned = cleaned.slice("storage/".length);
  }

  return typeof window !== "undefined"
    ? `/api/files/${cleaned}`
    : `${API_ORIGIN}/api/files/${cleaned}`;
}
