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

export interface NotificationSocketMessage {
  event: "notification.created" | "notifications.connected";
  data: Notification | { recruiter_id: number };
}
