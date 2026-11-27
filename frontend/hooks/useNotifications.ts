"use client";

import { useCallback, useEffect } from "react";

import { notificationService } from "@/services/notification.service";
import { useAuthStore } from "@/stores/auth.store";
import { useJobStore } from "@/stores/job.store";
import { useNotificationStore } from "@/stores/notification.store";
import { useLanguage } from "@/context/LanguageContext";
import type { Job } from "@/types/job";
import type { Notification, NotificationSocketMessage } from "@/types/notification";

export function useNotifications() {
  const { l } = useLanguage();
  const authUser = useAuthStore((state) => state.user);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const error = useNotificationStore((state) => state.error);
  const hydrate = useNotificationStore((state) => state.hydrate);
  const prepend = useNotificationStore((state) => state.prepend);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const setLoading = useNotificationStore((state) => state.setLoading);
  const setError = useNotificationStore((state) => state.setError);

  const recruiterId = authUser?.id ?? null;

  useEffect(() => {
    if (!recruiterId) return;
    let cancelled = false;

    setLoading(true);
    notificationService
      .list()
      .then((response) => {
        if (!cancelled) hydrate(response.items, response.unread_count);
      })
      .catch(() => {
        if (!cancelled) setError(l("Impossible de charger les notifications.", "Failed to load notifications."));
      });

    return () => {
      cancelled = true;
    };
  }, [hydrate, l, recruiterId, setError, setLoading]);

  useEffect(() => {
    if (!recruiterId) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    let retry = 0;

    const connect = async () => {
      if (stopped) return;

      let ticket: string | undefined;
      try {
        ticket = await notificationService.getWsTicket();
      } catch {
        // Fallback to HttpOnly cookie handshake if ticket fetch fails
      }
      if (stopped) return;

      socket = new WebSocket(notificationService.websocketUrl(recruiterId, ticket));

      socket.onopen = () => {
        retry = 0;
        pingTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
        }, 25_000);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as NotificationSocketMessage;
          if (payload.event === "notification.created") {
            prepend(payload.data as Notification);
          } else if (payload.event === "job.updated") {
            useJobStore.getState().upsertJob(payload.data as Job);
          }
        } catch {
          // Ignore malformed messages without terminating a healthy connection.
        }
      };

      socket.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (!stopped) {
          const delay = Math.min(30_000, 1_000 * 2 ** retry++);
          reconnectTimer = setTimeout(() => void connect(), delay);
        }
      };
    };

    void connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      socket?.close();
    };
  }, [prepend, recruiterId]);

  const markAsRead = useCallback(async (notificationId: number) => {
    const current = useNotificationStore
      .getState()
      .notifications.find((item) => item.id === notificationId);
    if (!current || current.is_read) return;
    markRead(notificationId);
    try {
      await notificationService.markAsRead(notificationId);
    } catch {
      const response = await notificationService.list();
      hydrate(response.items, response.unread_count);
    }
  }, [hydrate, markRead]);

  const deleteAll = useCallback(async () => {
    if (!recruiterId) return;
    try {
      await notificationService.deleteAll();
      hydrate([], 0);
    } catch {
      setError(l("Impossible de supprimer toutes les notifications.", "Failed to clear all notifications."));
    }
  }, [hydrate, l, recruiterId, setError]);

  const markAllAsRead = useCallback(async () => {
    markAllRead();
    try {
      await notificationService.markAllAsRead();
    } catch {
      const response = await notificationService.list();
      hydrate(response.items, response.unread_count);
    }
  }, [hydrate, markAllRead]);

  return { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead, deleteAll };
}
