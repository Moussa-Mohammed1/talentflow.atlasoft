import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { isPublicPath } from "@/lib/auth-routes";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl: string = error?.config?.url || "";
    const isAuthMutation =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/reset-password") ||
      requestUrl.includes("/auth/logout");

    if (status === 401 && !isAuthMutation && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
      useAuthStore.getState().logout();

      if (!isPublicPath(window.location.pathname)) {
        window.location.replace("/login?expired=true");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
