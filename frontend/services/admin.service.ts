import api from "@/lib/axios";
import type { AdminUser } from "@/types/admin";
import type { UserStats } from "@/types/auth";

export const AdminService = {
  async listUsers(): Promise<AdminUser[]> {
    const response = await api.get<AdminUser[]>("/admin/users");
    return response.data;
  },
  async getUserStats(userId: number): Promise<UserStats> {
    const response = await api.get<UserStats>(`/admin/users/${userId}/stats`);
    return response.data;
  },
  async updateUserRole(userId: number, role: string): Promise<{ message: string; user: AdminUser }> {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
};
