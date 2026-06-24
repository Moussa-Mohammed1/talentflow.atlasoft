"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  TriangleAlert,
} from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationType } from "@/types/notification";

const iconByType: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  warning: <TriangleAlert className="h-4 w-4 text-amber-600" />,
  error: <CircleAlert className="h-4 w-4 text-rose-600" />,
  info: <Info className="h-4 w-4 text-blue-600" />,
};

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of ranges) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(seconds, "second");
}

export default function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead } =
    useNotifications();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-full border border-slate-200/60 bg-slate-50 p-2 text-slate-500 transition-all hover:bg-slate-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
              <p className="text-[10px] text-slate-500">{unreadCount} unread</p>
            </div>
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={() => void markAllAsRead()}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={12} /> Mark all as read
            </button>
          </header>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {isLoading && notifications.length === 0 && (
              <div className="flex items-center justify-center gap-2 p-8 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading notifications…
              </div>
            )}
            {!isLoading && error && notifications.length === 0 && (
              <p className="p-6 text-center text-xs text-rose-600">{error}</p>
            )}
            {!isLoading && !error && notifications.length === 0 && (
              <p className="p-8 text-center text-xs text-slate-500">You’re all caught up.</p>
            )}
            {notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                onClick={() => void markAsRead(notification.id)}
                className={`flex w-full gap-3 p-3 text-left transition-colors hover:bg-slate-50 ${
                  notification.is_read ? "bg-white" : "bg-indigo-50/40"
                }`}
              >
                <span className="mt-0.5 h-fit shrink-0 rounded-lg bg-slate-100 p-1.5">
                  {iconByType[notification.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-900">
                    {notification.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-600">
                    {notification.message}
                  </span>
                  <time
                    dateTime={notification.created_at}
                    className="mt-1 block text-[10px] text-slate-400"
                  >
                    {relativeTime(notification.created_at)}
                  </time>
                </span>
                {!notification.is_read && (
                  <span className="self-center h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
