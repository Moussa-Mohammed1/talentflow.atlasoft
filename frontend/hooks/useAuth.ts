import { useAuthStore } from "@/store/auth.store";
import { AuthService } from "@/services/auth.service";

export const useAuth = () => {
  const {
    user,
    token,
    setUser,
    setToken,
    logout,
  } = useAuthStore();

  const login = async (
    email: string,
    password: string
  ) => {
    const data = await AuthService.login(
      email,
      password
    );

    setToken(data.access_token);

    localStorage.setItem(
      "access_token",
      data.access_token
    );

    const currentUser =
      await AuthService.me();

    setUser(currentUser.user);
  };

  return {
    user,
    token,
    login,
    logout,
  };
};
