import api from "@/lib/axios";
import type { Notification, NotificationListResponse } from "@/types/notification";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export const notificationService = {
  async list(): Promise<NotificationListResponse> {
    const response = await api.get<NotificationListResponse>("/notifications");
    return response.data;
  },

  async markAsRead(notificationId: number): Promise<Notification> {
    const response = await api.patch<Notification>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<{ updated_count: number }> {
    const response = await api.patch<{ updated_count: number }>("/notifications/read-all");
    return response.data;
  },

  async deleteAll(): Promise<{ deleted: number }> {
    const response = await api.delete<{ deleted: number }>("/notifications");
    return response.data;
  },

  websocketUrl(recruiterId: number, token: string): string {
    const configuredBase = process.env.NEXT_PUBLIC_WS_URL;
    const websocketBase = configuredBase
      ? configuredBase.replace(/\/$/, "")
      : apiBaseUrl.replace(/^http/, "ws").replace(/\/api\/?$/, "");
    return `${websocketBase}/ws/notifications/${recruiterId}?token=${encodeURIComponent(token)}`;
  },
};
