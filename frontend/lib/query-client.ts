import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isApiError, normalizeApiError } from "@/lib/api-error";

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 409, 415, 422]);

function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  const normalized = normalizeApiError(error);
  if (normalized.status && NON_RETRYABLE_STATUSES.has(normalized.status)) {
    return false;
  }
  return true;
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        const apiErr = isApiError(error) ? error : normalizeApiError(error);
        if (process.env.NODE_ENV !== "production" && apiErr.status >= 500) {
          console.error(
            `[QueryError ${apiErr.code}] ${apiErr.message} (correlation_id=${apiErr.correlationId ?? "none"})`
          );
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        const apiErr = isApiError(error) ? error : normalizeApiError(error);
        if (process.env.NODE_ENV !== "production" && apiErr.status >= 500) {
          console.error(
            `[MutationError ${apiErr.code}] ${apiErr.message} (correlation_id=${apiErr.correlationId ?? "none"})`
          );
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryRequest,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
