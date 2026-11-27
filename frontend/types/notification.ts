import type { Job } from "@/types/job";

export type NotificationType = "success" | "warning" | "error" | "info";

export interface Notification {
  id: number;
  recruiter_id: number;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  unread_count: number;
}

export type NotificationSocketMessage =
  | {
      event: "notification.created";
      data: Notification;
    }
  | {
      event: "notifications.connected";
      data: { recruiter_id: number };
    }
  | {
      event: "job.updated";
      data: Job;
    };
