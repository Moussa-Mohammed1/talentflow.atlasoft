import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export { PUBLIC_PATHS, isPublicPath } from "@/lib/auth-routes";

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    // Clean up any legacy client-side token remnants from prior builds
    localStorage.removeItem("access_token");
  }
  useAuthStore.getState().logout();
}

export async function restoreSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const data = await AuthService.me();
    if (!data?.user) {
      clearAuthSession();
      return false;
    }

    useAuthStore.getState().setUser(data.user);
    return true;
  } catch {
    clearAuthSession();
    return false;
  }
}
