import api from "@/lib/axios";
import { useAuthStore } from "@/stores/auth.store";
import type { UserStats } from "@/types/auth";

export const AuthService = {
    login: async (email: string, password: string) => {
        const response = await api.post("/auth/login", {
            email,
            password,
        });
        return response.data;
    },
    me: async () => {
        const response = await api.get("/auth/me", { withCredentials: true });
        return response.data;
    },
    getUserStats: async (): Promise<UserStats> => {
        const response = await api.get("/auth/me/stats");
        return response.data;
    },
    updateProfile: async (data: { fullname?: string; email?: string; avatar?: string; current_password?: string; new_password?: string }) => {
        const response = await api.patch("/auth/me", data);
        return response.data;
    },
    uploadAvatar: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await api.post("/auth/me/avatar", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },
    logout: async () => {
        try {
            await api.post("/auth/logout");
        } finally {
            localStorage.removeItem("access_token");
            useAuthStore.getState().logout();
        }
    },
    deleteAccount: async () => {
        const response = await api.delete("/auth/me");
        return response.data;
    },
}
