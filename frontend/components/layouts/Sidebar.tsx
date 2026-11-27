"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useModal } from "@/context/ModalContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuthStore } from "@/stores/auth.store";
import ProfileSection from "../user/ProfileSection";
import {
  AtlasoftAdminUsersIcon,
  AtlasoftBrandMark,
  AtlasoftDocumentsIcon,
  AtlasoftEvaluationsIcon,
  AtlasoftHelpIcon,
  AtlasoftHomeIcon,
  AtlasoftInviteIcon,
  AtlasoftJobsIcon,
  AtlasoftRecruitIcon,
  AtlasoftResourcesIcon,
  AtlasoftSettingsIcon,
  AtlasoftTalentsIcon,
} from "./AtlasoftIcons";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  matchPrefix?: boolean;
}

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const [adminExpanded, setAdminExpanded] = useState(true);
  const [flyoutPath, setFlyoutPath] = useState<string | null>(null);
  const pathname = usePathname();
  const { isModalOpen } = useModal();
  const { t, l } = useLanguage();
  const currentUserRole = useAuthStore((s) => s.user?.role);

  const adminFlyoutOpen = flyoutPath === pathname;
  const isAdmin = currentUserRole?.toLowerCase() === "admin";

  const sidebarItems: SidebarItem[] = [
    { icon: <AtlasoftHomeIcon size={18} />, label: t.nav.home, href: "/dashboard" },
    { icon: <AtlasoftResourcesIcon size={18} />, label: t.nav.resources, href: "/resources", matchPrefix: true },
    { icon: <AtlasoftDocumentsIcon size={18} />, label: t.nav.documents, href: "/documents" },
    { icon: <AtlasoftEvaluationsIcon size={18} />, label: t.nav.evaluations, href: "/evaluations" },
    { icon: <AtlasoftJobsIcon size={18} />, label: t.nav.jobOffers, href: "/jobs" },
    { icon: <AtlasoftTalentsIcon size={18} />, label: t.nav.talents, href: "/talents" },
    { icon: <AtlasoftRecruitIcon size={18} />, label: t.nav.recruit, href: "/recruitments" },
    { icon: <AtlasoftHelpIcon size={18} />, label: t.nav.help, href: "/help" },
  ];

  const adminItems: SidebarItem[] = [
    { icon: <AtlasoftAdminUsersIcon size={18} />, label: t.nav.users, href: "/admin" },
    { icon: <AtlasoftInviteIcon size={18} />, label: t.nav.invite, href: "/invitations" },
  ];

  const isItemActive = (item: SidebarItem) => {
    if (item.matchPrefix) {
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    }
    return pathname === item.href;
  };

  const navItemClass = (active: boolean, isCollapsed: boolean) =>
    `group/item relative flex w-full items-center text-[13px] transition-colors select-none ${
      isCollapsed ? "h-10 justify-center px-0" : "h-9 gap-3 px-3.5"
    } ${
      active
        ? "bg-[#dcdad8] dark:bg-[#323130] font-semibold text-[#323130] dark:text-white border-l-[3px] border-l-[#0078d4] dark:border-l-[#2899f5]"
        : "border-l-[3px] border-l-transparent font-normal text-[#323130] dark:text-[#f3f2f1] hover:bg-[#dcdad8] dark:hover:bg-[#323130]"
    }`;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 top-10 z-40 bg-black/50 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile slide-over sidebar */}
      <aside
        className={`fixed left-0 top-10 z-50 flex h-[calc(100vh-40px)] w-[224px] flex-col justify-between border-r border-[#d2d0ce] dark:border-[#3b3a39] bg-[#e8e6e4] dark:bg-[#252423] text-[#323130] dark:text-[#f3f2f1] font-atlasoft shadow-2xl transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto py-2">
          <div className="mb-1 flex items-center justify-between border-b border-[#d2d0ce] dark:border-[#3b3a39] px-3.5 pb-2">
            <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#605e5c] dark:text-[#a19f9d]">
              <AtlasoftBrandMark size={20} variant="auto" />
              {t.nav.navigation}
            </span>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label={l("Fermer le menu", "Close menu")}
              className="flex h-7 w-7 items-center justify-center rounded-[2px] text-[#605e5c] dark:text-[#d2d0ce] hover:bg-[#dcdad8] dark:hover:bg-[#323130] hover:text-[#323130] dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="space-y-0.5 pt-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={navItemClass(isItemActive(item), false)}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            ))}

            {isAdmin && (
              <div className="mt-2 border-t border-[#d2d0ce] dark:border-[#3b3a39] pt-2">
                <div className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#605e5c] dark:text-[#a19f9d]">
                  {t.nav.admin}
                </div>
                {adminItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={navItemClass(isItemActive(item), false)}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </nav>
        </div>

        <div className="border-t border-[#d2d0ce] dark:border-[#3b3a39] py-1.5">
          <Link
            href="/settings"
            onClick={onCloseMobile}
            className={navItemClass(pathname === "/settings", false)}
          >
            <span className="shrink-0">
              <AtlasoftSettingsIcon size={18} />
            </span>
            <span className="truncate">{t.nav.settings}</span>
          </Link>
          <div className="mt-1 border-t border-[#d2d0ce] dark:border-[#3b3a39] pt-1">
            <ProfileSection variant="sidebar" collapsed={false} />
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-[#d2d0ce] dark:border-[#3b3a39] bg-[#e8e6e4] dark:bg-[#252423] text-[#323130] dark:text-[#f3f2f1] font-atlasoft md:sticky md:top-10 md:flex md:h-[calc(100vh-40px)] md:flex-col md:justify-between transition-[width] duration-200 ease-out ${
          collapsed ? "w-12" : "w-[216px]"
        } ${isModalOpen ? "z-10" : "z-30"}`}
      >
        <div className={`flex-1 py-1.5 ${collapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"}`}>
          <nav className="space-y-0.5">
            {sidebarItems.map((item) => {
              const active = isItemActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={navItemClass(active, collapsed)}
                >
                  <span className="flex shrink-0 items-center justify-center">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}

                  {collapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-[2px] border border-[#edebe9] dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-2.5 py-1 text-[12px] font-normal text-[#323130] dark:text-white opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <div className="mt-2 border-t border-[#d2d0ce] dark:border-[#3b3a39] pt-2">
                {collapsed ? (
                  <div
                    className="relative"
                    onMouseEnter={() => setFlyoutPath(pathname)}
                    onMouseLeave={() => setFlyoutPath(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setFlyoutPath((prev) => (prev === pathname ? null : pathname))}
                      title={t.nav.admin}
                      className={navItemClass(
                        pathname === "/admin" || pathname === "/invitations",
                        true
                      )}
                    >
                      <AtlasoftAdminUsersIcon size={18} />
                    </button>

                    {adminFlyoutOpen && (
                      <div className="absolute left-full top-0 z-50 w-48 rounded-[2px] border border-[#d2d0ce] dark:border-[#3b3a39] bg-[#f3f2f1] dark:bg-[#252423] py-1 shadow-xl">
                        <div className="border-b border-[#d2d0ce] dark:border-[#3b3a39] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#605e5c] dark:text-[#a19f9d]">
                          {t.nav.admin}
                        </div>
                        {adminItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setFlyoutPath(null)}
                            className={`flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
                              pathname === item.href
                                ? "bg-[#dcdad8] dark:bg-[#323130] font-semibold text-[#323130] dark:text-white border-l-[3px] border-l-[#0078d4] dark:border-l-[#2899f5]"
                                : "border-l-[3px] border-l-transparent text-[#323130] dark:text-[#f3f2f1] hover:bg-[#dcdad8] dark:hover:bg-[#323130]"
                            }`}
                          >
                            {item.icon}
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setAdminExpanded((prev) => !prev)}
                      className="flex w-full items-center justify-between px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#605e5c] dark:text-[#a19f9d] hover:text-[#323130] dark:hover:text-white"
                    >
                      <span>{t.nav.admin}</span>
                      {adminExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    {adminExpanded && (
                      <div className="space-y-0.5">
                        {adminItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={navItemClass(isItemActive(item), false)}
                          >
                            <span className="shrink-0">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="border-t border-[#d2d0ce] dark:border-[#3b3a39] py-1.5">
          <Link
            href="/settings"
            title={collapsed ? t.nav.settings : undefined}
            className={navItemClass(pathname === "/settings", collapsed)}
          >
            <span className="shrink-0">
              <AtlasoftSettingsIcon size={18} />
            </span>
            {!collapsed && <span className="truncate">{t.nav.settings}</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-[2px] border border-[#edebe9] dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-2.5 py-1 text-[12px] font-normal text-[#323130] dark:text-white opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100">
                {t.nav.settings}
              </span>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}
