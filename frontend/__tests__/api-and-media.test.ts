import { AxiosError, AxiosHeaders } from "axios";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { ApiError, getErrorMessage, isApiError, normalizeApiError } from "@/lib/api-error";
import { resolveMediaUrl } from "@/lib/media";
import { proxy } from "@/proxy";

describe("ApiError normalization", () => {
  it("parses unified backend error envelope and correlation_id", () => {
    const axiosErr = new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 422,
      statusText: "Unprocessable Content",
      headers: new AxiosHeaders({ "x-request-id": "cid-header-fallback" }),
      config: { headers: new AxiosHeaders() },
      data: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation error",
          details: [{ loc: ["body", "email"], msg: "invalid" }],
          correlation_id: "cid-from-body",
        },
        detail: "Validation error",
      },
    });

    const normalized = normalizeApiError(axiosErr);
    expect(isApiError(normalized)).toBe(true);
    expect(normalized).toBeInstanceOf(ApiError);
    expect(normalized.status).toBe(422);
    expect(normalized.code).toBe("VALIDATION_ERROR");
    expect(normalized.message).toBe("Validation error");
    expect(normalized.correlationId).toBe("cid-from-body");
    expect(normalized.isNetworkError).toBe(false);
  });

  it("falls back to x-request-id header and network error defaults", () => {
    const networkErr = new AxiosError("Network Error", "ERR_NETWORK");
    const normalizedNet = normalizeApiError(networkErr);
    expect(normalizedNet.code).toBe("NETWORK_ERROR");
    expect(normalizedNet.isNetworkError).toBe(true);

    const headerErr = new AxiosError("Not found", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 404,
      statusText: "Not Found",
      headers: new AxiosHeaders({ "x-request-id": "req-abc" }),
      config: { headers: new AxiosHeaders() },
      data: { detail: "CV introuvable" },
    });
    const normalizedHeader = normalizeApiError(headerErr);
    expect(normalizedHeader.correlationId).toBe("req-abc");
    expect(getErrorMessage(headerErr, "Fallback")).toBe("CV introuvable");
  });
});

describe("resolveMediaUrl", () => {
  it("normalizes relative, legacy /storage, and Windows paths to authenticated /api/files", () => {
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl("  ")).toBeNull();
    expect(resolveMediaUrl("candidate_photos/candidate_1.jpg")).toMatch(/\/api\/files\/candidate_photos\/candidate_1\.jpg$/);
    expect(resolveMediaUrl("/storage/avatars/user.png")).toMatch(/\/api\/files\/avatars\/user\.png$/);
    expect(resolveMediaUrl("storage\\resumes\\cv.pdf")).toMatch(/\/api\/files\/resumes\/cv\.pdf$/);
    expect(resolveMediaUrl("https://cdn.example.com/pic.png")).toBe("https://cdn.example.com/pic.png");
  });
});

describe("proxy route protection", () => {
  it("never intercepts /api/* requests even without access_token cookie", () => {
    const loginApiReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
    });
    const res = proxy(loginApiReq);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated page navigation to /login", () => {
    const dashboardReq = new NextRequest("http://localhost:3000/dashboard");
    const res = proxy(dashboardReq);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });
});
