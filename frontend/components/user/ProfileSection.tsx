"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { User, Settings, LogOut, Loader2 } from "lucide-react";
import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";

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

  const initials = useMemo(() => getInitials(user?.fullname ?? ""), [user?.fullname]);

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
          <div className="absolute bottom-full left-0 z-50 mb-1 w-52 rounded-[2px] border border-[#3b3a39] bg-[#252423] p-1 text-[#f3f2f1] shadow-xl">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/profile");
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#f3f2f1] hover:bg-[#323130]"
            >
              <User size={14} className="text-[#50e6ff]" />
              <span>Mon Profil</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/settings");
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#f3f2f1] hover:bg-[#323130]"
            >
              <Settings size={14} className="text-[#50e6ff]" />
              <span>Paramètres</span>
            </button>
            <div className="my-1 h-px bg-[#3b3a39]" />
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#f1707b] hover:bg-[#323130] disabled:opacity-60"
            >
              <LogOut size={14} />
              <span>Déconnexion</span>
              {isLoggingOut && <Loader2 size={12} className="animate-spin" />}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-[#f3f2f1] transition-colors hover:bg-[#323130] ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.fullname || ""}
              className="h-6 w-6 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0078d4] text-[10px] font-semibold text-white">
              {initials}
            </div>
          )}
          {!collapsed && (
            <span className="truncate text-left font-medium">
              {user?.fullname || "Compte"}
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
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.fullname || ""}
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
          className="absolute right-0 top-full z-50 w-72 rounded-[2px] border border-[#edebe9] bg-white text-[#323130] shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[#edebe9] bg-[#faf9f8] px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">
              {secondaryLabel}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#0078d4] hover:underline disabled:opacity-60"
            >
              {isLoggingOut ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <LogOut size={12} />
              )}
              Se déconnecter
            </button>
          </div>

          <div className="flex items-center gap-3 px-4 py-3.5">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.fullname || ""}
                className="h-12 w-12 shrink-0 rounded-full border border-[#edebe9] object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0078d4] text-[15px] font-semibold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-[#323130]">
                {user?.fullname || "Utilisateur"}
              </p>
              <p className="truncate text-[12px] text-[#605e5c]">
                {user?.email || ""}
              </p>
            </div>
          </div>

          <div className="border-t border-[#edebe9] py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/profile");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-[#323130] transition-colors hover:bg-[#f3f2f1]"
            >
              <User size={15} className="text-[#0078d4]" />
              <span>Mon Profil</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/settings");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-[#323130] transition-colors hover:bg-[#f3f2f1]"
            >
              <Settings size={15} className="text-[#0078d4]" />
              <span>Paramètres</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
