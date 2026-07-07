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
    token: string | null;
    setUser: (user: User) => void;
    setToken: (token: string) => void;
    logout: () => void;
    updateUserField: (field: keyof User, value: string | boolean | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    setUser: (user) =>
        set({
            user,
        }),

    setToken: (token) =>
        set({
            token,
        }),

    logout: () =>
        set({
            user: null,
            token: null,
        }),

    updateUserField: (field, value) =>
        set((state) => ({
            user: state.user ? { ...state.user, [field]: value } : null,
        })),
}));