import axios, { type AxiosResponse } from "axios";

export interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    correlation_id?: string;
  };
  detail?: unknown;
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly correlationId: string | null;
  readonly isNetworkError: boolean;
  readonly response?: AxiosResponse<ApiErrorEnvelope>;

  constructor(options: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
    correlationId?: string | null;
    isNetworkError?: boolean;
    response?: AxiosResponse<ApiErrorEnvelope>;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details ?? null;
    this.correlationId = options.correlationId ?? null;
    this.isNetworkError = Boolean(options.isNetworkError);
    this.response = options.response;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError || (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ApiError" &&
    "status" in error &&
    "code" in error
  );
}

export function normalizeApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (axios.isAxiosError<ApiErrorEnvelope>(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const headerCid =
      typeof error.response?.headers?.["x-request-id"] === "string"
        ? error.response.headers["x-request-id"]
        : null;

    const envelope = data && typeof data === "object" ? data.error : undefined;
    const code =
      envelope?.code ||
      (status === 0 ? "NETWORK_ERROR" : `HTTP_${status}`);

    const rawDetail =
      typeof data?.detail === "string"
        ? data.detail
        : undefined;

    const message =
      envelope?.message ||
      rawDetail ||
      (typeof data?.message === "string" ? data.message : undefined) ||
      error.message ||
      "Unexpected request error";

    return new ApiError({
      status,
      code,
      message,
      details: envelope?.details ?? null,
      correlationId: envelope?.correlation_id ?? headerCid,
      isNetworkError: !error.response,
      response: error.response,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      status: 0,
      code: "CLIENT_ERROR",
      message: error.message,
      isNetworkError: false,
    });
  }

  return new ApiError({
    status: 0,
    code: "UNKNOWN_ERROR",
    message: "Unexpected error",
    isNetworkError: false,
  });
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const normalized = normalizeApiError(error);
  return normalized.message || fallback;
}
