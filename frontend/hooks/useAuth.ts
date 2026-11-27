import { useAuthStore } from "@/stores/auth.store";
import { AuthService } from "@/services/auth.service";

export const useAuth = () => {
  const { user, setUser, logout } = useAuthStore();

  const login = async (email: string, password: string) => {
    await AuthService.login(email, password);
    const currentUser = await AuthService.me();
    setUser(currentUser.user);
  };

  return {
    user,
    login,
    logout,
  };
};
