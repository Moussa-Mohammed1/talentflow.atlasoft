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
  success: <CheckCircle2 className="h-4 w-4 text-[#107c10]" />,
  warning: <TriangleAlert className="h-4 w-4 text-[#d83b01]" />,
  error: <CircleAlert className="h-4 w-4 text-[#a80000]" />,
  info: <Info className="h-4 w-4 text-[#0078d4]" />,
};

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
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
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead, deleteAll } =
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
    <div className="relative inline-flex h-full items-center font-atlasoft" ref={dropdownRef}>
      <button
        type="button"
        title="Notifications"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} non lues` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((open) => !open)}
        className={`relative flex h-10 w-10 items-center justify-center text-white transition-colors focus:outline-none ${
          isOpen ? "bg-[#323130]" : "hover:bg-[#323130]"
        }`}
      >
        <Bell size={16} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none text-[#1b1a19] ring-1 ring-[#1b1a19]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 w-[22rem] overflow-hidden rounded-[2px] border border-[#edebe9] bg-white text-[#323130] shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-[#edebe9] bg-[#faf9f8] px-4 py-3">
            <div>
              <h3 className="text-[13px] font-semibold text-[#323130]">Notifications</h3>
              <p className="text-[11px] text-[#605e5c]">
                {unreadCount} non lue{unreadCount !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={() => void markAllAsRead()}
              className="flex items-center gap-1 text-[12px] font-medium text-[#0078d4] transition-colors hover:text-[#106ebe] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={12} /> Tout marquer comme lu
            </button>
          </header>

          <div className="max-h-96 divide-y divide-[#edebe9] overflow-y-auto">
            {isLoading && notifications.length === 0 && (
              <div className="flex items-center justify-center gap-2 p-8 text-[12px] text-[#605e5c]">
                <Loader2 className="h-4 w-4 animate-spin text-[#0078d4]" /> Chargement des notifications…
              </div>
            )}
            {!isLoading && error && notifications.length === 0 && (
              <p className="p-6 text-center text-[12px] text-[#a80000]">{error}</p>
            )}
            {!isLoading && !error && notifications.length === 0 && (
              <p className="p-8 text-center text-[12px] text-[#605e5c]">Tout est à jour.</p>
            )}
            {notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                onClick={() => void markAsRead(notification.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f3f2f1] ${
                  notification.is_read ? "bg-white" : "bg-[#eff6fc]"
                }`}
              >
                <span className="mt-0.5 shrink-0">{iconByType[notification.type] ?? iconByType.info}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-[#323130]">
                    {notification.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-[#605e5c]">
                    {notification.message}
                  </span>
                  <time
                    dateTime={notification.created_at}
                    className="mt-1 block text-[10px] text-[#8a8886]"
                  >
                    {relativeTime(notification.created_at)}
                  </time>
                </span>
                {!notification.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0078d4]" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-[#edebe9] bg-[#faf9f8] p-2 text-center">
            <button
              type="button"
              onClick={() => void deleteAll()}
              className="w-full rounded-[2px] py-1.5 text-[12px] font-medium text-[#a80000] transition-colors hover:bg-[#fde7e9]"
            >
              Tout supprimer
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
