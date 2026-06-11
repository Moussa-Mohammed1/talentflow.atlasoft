import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

export async function restoreSession() {
  const token =
    localStorage.getItem("access_token");

  if (!token) return;

  try {
    const user =
      await AuthService.me();

    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setToken(token);
  } catch {
    localStorage.removeItem(
      "access_token"
    );
  }
}