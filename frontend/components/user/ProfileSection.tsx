"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { User, Settings, LogOut, Loader2 } from "lucide-react";
import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { resolveMediaUrl } from "@/lib/media";

interface ProfileSectionProps {
  collapsed?: boolean;
  variant?: "topbar" | "sidebar";
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase() || "?";
}

export default function ProfileSection({
  collapsed = false,
  variant = "topbar",
}: ProfileSectionProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { t, l } = useLanguage();

  const initials = useMemo(() => getInitials(user?.fullname ?? ""), [user?.fullname]);
  const avatarSrc = useMemo(() => resolveMediaUrl(user?.avatar), [user?.avatar]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await AuthService.logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (variant === "sidebar") {
    return (
      <div className="relative w-full font-atlasoft" ref={containerRef}>
        {isOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-1 w-52 rounded-[2px] border border-[#edebe9] dark:border-[#3b3a39] bg-white dark:bg-[#252423] p-1 text-[#323130] dark:text-[#f3f2f1] shadow-xl">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/profile");
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#323130] dark:text-[#f3f2f1] hover:bg-[#edebe9] dark:hover:bg-[#323130]"
            >
              <User size={14} className="text-[#484644] dark:text-white" />
              <span>{t.nav.profile}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/settings");
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#323130] dark:text-[#f3f2f1] hover:bg-[#edebe9] dark:hover:bg-[#323130]"
            >
              <Settings size={14} className="text-[#484644] dark:text-white" />
              <span>{t.nav.settings}</span>
            </button>
            <div className="my-1 h-px bg-[#edebe9] dark:bg-[#3b3a39]" />
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#a80000] dark:text-[#f1707b] hover:bg-[#edebe9] dark:hover:bg-[#323130] disabled:opacity-60"
            >
              <LogOut size={14} />
              <span>{l("Déconnexion", "Log out")}</span>
              {isLoggingOut && <Loader2 size={12} className="animate-spin" />}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-[#323130] dark:text-[#f3f2f1] transition-colors hover:bg-[#dcdad8] dark:hover:bg-[#323130] ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={user?.fullname || ""}
              className="h-6 w-6 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0078d4] text-[10px] font-semibold text-white">
              {initials}
            </div>
          )}
          {!collapsed && (
            <span className="truncate text-left font-medium">
              {user?.fullname || l("Compte", "Account")}
            </span>
          )}
        </button>
      </div>
    );
  }

  const primaryLabel = user?.email || user?.fullname || "utilisateur@talentflow";
  const secondaryLabel = (user?.role || "TALENTFLOW").toUpperCase();

  return (
    <div className="relative flex h-full items-center font-atlasoft" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`flex h-10 items-center gap-2.5 px-3 text-left transition-colors focus:outline-none ${
          isOpen ? "bg-[#323130]" : "hover:bg-[#323130]"
        }`}
      >
        <div className="hidden text-right md:block">
          <div className="max-w-[170px] truncate text-[12px] font-semibold leading-tight text-white">
            {primaryLabel}
          </div>
          <div className="max-w-[170px] truncate text-[10px] font-normal uppercase tracking-wider leading-tight text-[#d2d0ce]">
            {secondaryLabel}
          </div>
        </div>
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={user?.fullname || ""}
            className="h-7 w-7 shrink-0 rounded-full border border-white/25 object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#0078d4] text-[11px] font-semibold text-white">
            {initials}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 w-72 rounded-[2px] border border-[#edebe9] dark:border-[#3b3a39] bg-white dark:bg-[#252423] text-[#323130] dark:text-[#f3f2f1] shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[#edebe9] dark:border-[#3b3a39] bg-[#faf9f8] dark:bg-[#1b1a19] px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#605e5c] dark:text-[#a19f9d]">
              {secondaryLabel}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#0078d4] dark:text-[#4ea8ff] hover:underline disabled:opacity-60"
            >
              {isLoggingOut ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <LogOut size={12} />
              )}
              {l("Se déconnecter", "Sign out")}
            </button>
          </div>

          <div className="flex items-center gap-3 px-4 py-3.5">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={user?.fullname || ""}
                className="h-12 w-12 shrink-0 rounded-full border border-[#edebe9] dark:border-[#3b3a39] object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0078d4] text-[15px] font-semibold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-[#323130] dark:text-[#f3f2f1]">
                {user?.fullname || l("Utilisateur", "User")}
              </p>
              <p className="truncate text-[12px] text-[#605e5c] dark:text-[#a19f9d]">
                {user?.email || ""}
              </p>
            </div>
          </div>

          <div className="border-t border-[#edebe9] dark:border-[#3b3a39] py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/profile");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-[#323130] dark:text-[#f3f2f1] transition-colors hover:bg-[#f3f2f1] dark:hover:bg-[#323130]"
            >
              <User size={15} className="text-[#0078d4] dark:text-[#4ea8ff]" />
              <span>{t.nav.profile}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/settings");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-[#323130] dark:text-[#f3f2f1] transition-colors hover:bg-[#f3f2f1] dark:hover:bg-[#323130]"
            >
              <Settings size={15} className="text-[#0078d4] dark:text-[#4ea8ff]" />
              <span>{t.nav.settings}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
