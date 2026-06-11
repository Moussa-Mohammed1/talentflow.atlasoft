import { create } from "zustand";

interface User {
    id: number;
    email: string;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    setUser: (user: User) => void;
    setToken: (token: string) => void;
    logout: () => void;
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
}));