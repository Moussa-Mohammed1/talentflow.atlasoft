"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useModal } from "@/context/ModalContext";
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
  const currentUserRole = useAuthStore((s) => s.user?.role);

  const adminFlyoutOpen = flyoutPath === pathname;

  const isAdmin = currentUserRole?.toLowerCase() === "admin";

  const sidebarItems: SidebarItem[] = [
    { icon: <AtlasoftHomeIcon size={18} />, label: "Accueil", href: "/dashboard" },
    { icon: <AtlasoftResourcesIcon size={18} />, label: "Resources", href: "/resources", matchPrefix: true },
    { icon: <AtlasoftDocumentsIcon size={18} />, label: "Documents", href: "/documents" },
    { icon: <AtlasoftEvaluationsIcon size={18} />, label: "Évaluations", href: "/evaluations" },
    { icon: <AtlasoftJobsIcon size={18} />, label: "Offre d'emploi", href: "/jobs" },
    { icon: <AtlasoftTalentsIcon size={18} />, label: "Talents", href: "/talents" },
    { icon: <AtlasoftRecruitIcon size={18} />, label: "Recruter", href: "/recruitments" },
    { icon: <AtlasoftHelpIcon size={18} />, label: "Aide", href: "/help" },
  ];

  const adminItems: SidebarItem[] = [
    { icon: <AtlasoftAdminUsersIcon size={18} />, label: "Utilisateurs", href: "/admin" },
    { icon: <AtlasoftInviteIcon size={18} />, label: "Inviter", href: "/invitations" },
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
        ? "bg-[#323130] font-semibold text-white border-l-[3px] border-l-[#2899f5]"
        : "border-l-[3px] border-l-transparent font-normal text-[#f3f2f1] hover:bg-[#323130] hover:text-white"
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-10 z-40 bg-black/50 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile slide-over sidebar */}
      <aside
        className={`fixed left-0 top-10 z-50 flex h-[calc(100vh-40px)] w-[224px] flex-col justify-between border-r border-[#3b3a39] bg-[#252423] text-[#f3f2f1] font-atlasoft shadow-2xl transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto py-2">
          <div className="mb-1 flex items-center justify-between border-b border-[#3b3a39] px-3.5 pb-2">
            <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#a19f9d]">
              <AtlasoftBrandMark size={20} />
              Navigation
            </span>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fermer le menu"
              className="flex h-7 w-7 items-center justify-center rounded-[2px] text-[#d2d0ce] hover:bg-[#323130] hover:text-white"
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
              <div className="mt-2 border-t border-[#3b3a39] pt-2">
                <div className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#a19f9d]">
                  Administration
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

        <div className="border-t border-[#3b3a39] py-1.5">
          <Link
            href="/settings"
            onClick={onCloseMobile}
            className={navItemClass(pathname === "/settings", false)}
          >
            <span className="shrink-0">
              <AtlasoftSettingsIcon size={18} />
            </span>
            <span className="truncate">Paramètres</span>
          </Link>
          <div className="mt-1 border-t border-[#3b3a39] pt-1">
            <ProfileSection variant="sidebar" collapsed={false} />
          </div>
        </div>
      </aside>

      {/* Desktop dark sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-[#3b3a39] bg-[#252423] text-[#f3f2f1] font-atlasoft md:sticky md:top-10 md:flex md:h-[calc(100vh-40px)] md:flex-col md:justify-between transition-[width] duration-200 ease-out ${
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
                    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-[2px] border border-[#3b3a39] bg-[#1b1a19] px-2.5 py-1 text-[12px] font-normal text-white opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <div className="mt-2 border-t border-[#3b3a39] pt-2">
                {collapsed ? (
                  <div
                    className="relative"
                    onMouseEnter={() => setFlyoutPath(pathname)}
                    onMouseLeave={() => setFlyoutPath(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setFlyoutPath((prev) => (prev === pathname ? null : pathname))}
                      title="Administration"
                      className={navItemClass(
                        pathname === "/admin" || pathname === "/invitations",
                        true
                      )}
                    >
                      <AtlasoftAdminUsersIcon size={18} />
                    </button>

                    {adminFlyoutOpen && (
                      <div className="absolute left-full top-0 z-50 w-48 rounded-[2px] border border-[#3b3a39] bg-[#252423] py-1 shadow-xl">
                        <div className="border-b border-[#3b3a39] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#a19f9d]">
                          Administration
                        </div>
                        {adminItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setFlyoutPath(null)}
                            className={`flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
                              pathname === item.href
                                ? "bg-[#323130] font-semibold text-white border-l-[3px] border-l-[#2899f5]"
                                : "border-l-[3px] border-l-transparent text-[#f3f2f1] hover:bg-[#323130]"
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
                      className="flex w-full items-center justify-between px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#a19f9d] hover:text-white"
                    >
                      <span>Administration</span>
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

        {/* Bottom settings shortcut */}
        <div className="border-t border-[#3b3a39] py-1.5">
          <Link
            href="/settings"
            title={collapsed ? "Paramètres" : undefined}
            className={navItemClass(pathname === "/settings", collapsed)}
          >
            <span className="shrink-0">
              <AtlasoftSettingsIcon size={18} />
            </span>
            {!collapsed && <span className="truncate">Paramètres</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-[2px] border border-[#3b3a39] bg-[#1b1a19] px-2.5 py-1 text-[12px] font-normal text-white opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100">
                Paramètres
              </span>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}
