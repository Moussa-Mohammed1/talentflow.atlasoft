import axios, { type AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { isPublicPath } from "@/lib/auth-routes";
import { normalizeApiError } from "@/lib/api-error";

const apiBaseUrl =
  typeof window !== "undefined"
    ? "/api"
    : process.env.BACKEND_INTERNAL_URL
      ? `${process.env.BACKEND_INTERNAL_URL.replace(/\/$/, "")}/api`
      : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

interface RetryableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSessionOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${apiBaseUrl}/auth/refresh`, undefined, { withCredentials: true })
      .then((res) => {
        if (res.data?.user) {
          useAuthStore.getState().setUser(res.data.user);
        }
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const AUTH_EXEMPT_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/linkedin/exchange",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/accept-invite",
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const config = (error?.config || {}) as RetryableConfig;
    const requestUrl: string = config.url || "";
    const isAuthMutation = AUTH_EXEMPT_PATHS.some((p) => requestUrl.includes(p));

    if (
      status === 401 &&
      !isAuthMutation &&
      !config._retry &&
      typeof window !== "undefined"
    ) {
      config._retry = true;
      const refreshed = await refreshSessionOnce();
      if (refreshed) {
        return api.request(config);
      }

      useAuthStore.getState().logout();
      if (!isPublicPath(window.location.pathname)) {
        window.location.replace("/login?expired=true");
      }
    }

    return Promise.reject(normalizeApiError(error));
  }
);

export default api;
