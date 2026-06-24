import { create } from "zustand";

import type { Notification } from "@/types/notification";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hydrate: (notifications: Notification[], unreadCount: number) => void;
  prepend: (notification: Notification) => void;
  markRead: (notificationId: number) => void;
  markAllRead: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  hydrate: (notifications, unreadCount) =>
    set({ notifications, unreadCount, isLoading: false, error: null }),

  prepend: (notification) =>
    set((state) => {
      const withoutDuplicate = state.notifications.filter((item) => item.id !== notification.id);
      const alreadyUnread = state.notifications.some(
        (item) => item.id === notification.id && !item.is_read,
      );
      return {
        notifications: [notification, ...withoutDuplicate].slice(0, 100),
        unreadCount:
          !notification.is_read && !alreadyUnread ? state.unreadCount + 1 : state.unreadCount,
      };
    }),

  markRead: (notificationId) =>
    set((state) => {
      const target = state.notifications.find((item) => item.id === notificationId);
      if (!target || target.is_read) return state;
      return {
        notifications: state.notifications.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({ ...item, is_read: true })),
      unreadCount: 0,
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set({ notifications: [], unreadCount: 0, isLoading: false, error: null }),
}));
