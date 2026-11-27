"use client";

import React, { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Upperbar from "./Upperbar";
import Sidebar from "./Sidebar";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppShellProps {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  headerCenter?: React.ReactNode;
  headerActions?: React.ReactNode;
  headerLeftExtra?: React.ReactNode;
  backgroundClassName?: string;
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "talentflow_atlasoft_sidebar_collapsed";
const SIDEBAR_EVENT = "talentflow-sidebar-toggle";

function subscribeSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_EVENT, callback);
  };
}

function getSidebarSnapshot(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export default function AppShell({
  title,
  subtitle,
  icon,
  breadcrumbs,
  headerCenter,
  headerActions,
  headerLeftExtra,
  backgroundClassName = "bg-[#f3f2f1]",
  children,
}: AppShellProps) {
  const collapsed = useSyncExternalStore(subscribeSidebar, getSidebarSnapshot, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
      return;
    }
    try {
      const next = !getSidebarSnapshot();
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      window.dispatchEvent(new Event(SIDEBAR_EVENT));
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className={`flex min-h-screen flex-col ${backgroundClassName} text-[#323130] font-sans selection:bg-[#cce8ff]`}>
      <Upperbar onToggleSidebar={handleToggleSidebar} sidebarOpen={!collapsed} />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={handleCloseMobile}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Blade Header */}
          <div className="border-b border-[#edebe9] bg-white px-6 py-3 font-atlasoft">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav aria-label="Fil d'Ariane" className="mb-1.5 flex items-center gap-1 text-[12px] text-[#605e5c]">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={`${crumb.label}-${index}`}>
                    {index > 0 && <ChevronRight size={12} className="text-[#8a8886]" />}
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-[#0078d4] hover:underline">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-[#323130]">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {headerLeftExtra}
                {icon && <span className="shrink-0">{icon}</span>}
                <div className="min-w-0">
                  <h1 className="truncate text-[18px] font-semibold leading-tight text-[#323130]">
                    {title}
                  </h1>
                  {subtitle && (
                    <div className="mt-0.5 text-[12px] text-[#605e5c]">{subtitle}</div>
                  )}
                </div>
              </div>

              {headerCenter && (
                <div className="w-full max-w-md flex-1 md:mx-4 md:w-auto">
                  {headerCenter}
                </div>
              )}

              {headerActions && (
                <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
              )}
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
