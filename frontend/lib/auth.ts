import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export { PUBLIC_PATHS, isPublicPath } from "@/lib/auth-routes";

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
  }
  useAuthStore.getState().logout();
}

export async function restoreSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const token = localStorage.getItem("access_token");
  if (!token) {
    clearAuthSession();
    return false;
  }

  try {
    const data = await AuthService.me();
    if (!data?.user) {
      clearAuthSession();
      return false;
    }

    document.cookie = `access_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    useAuthStore.getState().setUser(data.user);
    useAuthStore.getState().setToken(token);
    return true;
  } catch {
    clearAuthSession();
    return false;
  }
}
