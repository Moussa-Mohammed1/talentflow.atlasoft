"use client";

import { useCallback, useEffect, useMemo } from "react";

import { notificationService } from "@/services/notification.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import type { Notification, NotificationSocketMessage } from "@/types/notification";

function userIdFromToken(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(normalized)) as { sub?: string };
    const userId = Number(decoded.sub);
    return Number.isInteger(userId) ? userId : null;
  } catch {
    return null;
  }
}

export function useNotifications() {
  const authUser = useAuthStore((state) => state.user);
  const authToken = useAuthStore((state) => state.token);
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

  const token = useMemo(
    () => authToken || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null),
    [authToken],
  );
  const recruiterId = authUser?.id ?? userIdFromToken(token);

  useEffect(() => {
    if (!token || !recruiterId) return;
    let cancelled = false;

    setLoading(true);
    notificationService
      .list()
      .then((response) => {
        if (!cancelled) hydrate(response.items, response.unread_count);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load notifications.");
      });

    return () => {
      cancelled = true;
    };
  }, [hydrate, recruiterId, setError, setLoading, token]);

  useEffect(() => {
    if (!token || !recruiterId) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    let retry = 0;

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(notificationService.websocketUrl(recruiterId, token));

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
          }
        } catch {
          // Ignore malformed messages without terminating a healthy connection.
        }
      };

      socket.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (!stopped) {
          const delay = Math.min(30_000, 1_000 * 2 ** retry++);
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      socket?.close();
    };
  }, [prepend, recruiterId, token]);

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

  const markAllAsRead = useCallback(async () => {
    markAllRead();
    try {
      await notificationService.markAllAsRead();
    } catch {
      const response = await notificationService.list();
      hydrate(response.items, response.unread_count);
    }
  }, [hydrate, markAllRead]);

  return { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead };
}
