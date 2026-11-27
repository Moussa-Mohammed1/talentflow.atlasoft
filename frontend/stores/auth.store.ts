import { create } from "zustand";

interface User {
  id: number;
  email: string;
  role: string;
  fullname: string;
  avatar?: string | null;
  is_active: boolean;
  must_change_password: boolean;
  email_verified: boolean;
  email_verified_at?: string | null;
  created_at?: string | null;
  auth_provider: string;
}

interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  logout: () => void;
  updateUserField: (field: keyof User, value: string | boolean | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
  updateUserField: (field, value) =>
    set((state) => ({
      user: state.user ? { ...state.user, [field]: value } : null,
    })),
}));
