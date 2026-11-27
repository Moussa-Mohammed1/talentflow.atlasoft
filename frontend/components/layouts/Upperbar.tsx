"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HelpCircle, Menu, Search, Settings, X } from "lucide-react";
import NotificationButton from "@/components/ui/NotificationButton";
import SystemJobs from "@/components/ui/SystemJobs";
import ProfileSection from "@/components/user/ProfileSection";
import { useAuthStore } from "@/stores/auth.store";
import { useModal } from "@/context/ModalContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  AtlasoftAdminUsersIcon,
  AtlasoftBrandMark,
  AtlasoftDepartmentsIcon,
  AtlasoftDocumentsIcon,
  AtlasoftEvaluationsIcon,
  AtlasoftHelpIcon,
  AtlasoftHomeIcon,
  AtlasoftInviteIcon,
  AtlasoftJobsIcon,
  AtlasoftProfileIcon,
  AtlasoftRecruitIcon,
  AtlasoftResourcesIcon,
  AtlasoftSettingsIcon,
  AtlasoftTalentsIcon,
} from "./AtlasoftIcons";

interface QuickNavItem {
  label: string;
  category: string;
  href: string;
  keywords: string;
  adminOnly?: boolean;
  icon: React.ReactNode;
}

interface UpperbarProps {
  onToggleSidebar: () => void;
  sidebarOpen?: boolean;
}

export default function Upperbar({ onToggleSidebar, sidebarOpen = true }: UpperbarProps) {
  const router = useRouter();
  const currentUserRole = useAuthStore((s) => s.user?.role);
  const { isModalOpen } = useModal();
  const { t, l } = useLanguage();
  const isAdmin = currentUserRole?.toLowerCase() === "admin";

  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickNavItems = useMemo<QuickNavItem[]>(
    () => [
      {
        label: t.nav.home,
        category: t.categories.services,
        href: "/dashboard",
        keywords: "dashboard home tableau de bord accueil",
        icon: <AtlasoftHomeIcon size={16} />,
      },
      {
        label: t.nav.resources,
        category: t.categories.services,
        href: "/resources",
        keywords: "resources ressources configuration",
        icon: <AtlasoftResourcesIcon size={16} />,
      },
      {
        label: t.nav.departments,
        category: t.categories.resources,
        href: "/resources/departements",
        keywords: "departments departements teams equipes skills competences",
        icon: <AtlasoftDepartmentsIcon size={16} />,
      },
      {
        label: t.nav.documents,
        category: t.categories.services,
        href: "/documents",
        keywords: "cv resume files fichiers import importer",
        icon: <AtlasoftDocumentsIcon size={16} />,
      },
      {
        label: t.nav.evaluations,
        category: t.categories.services,
        href: "/evaluations",
        keywords: "scores candidates candidats ai ia analysis evaluations",
        icon: <AtlasoftEvaluationsIcon size={16} />,
      },
      {
        label: t.nav.jobOffersPlural,
        category: t.categories.services,
        href: "/jobs",
        keywords: "positions postes jobs recruitment offres emploi",
        icon: <AtlasoftJobsIcon size={16} />,
      },
      {
        label: t.nav.talents,
        category: t.categories.services,
        href: "/talents",
        keywords: "candidates candidats profiles profils favorites favoris talents",
        icon: <AtlasoftTalentsIcon size={16} />,
      },
      {
        label: t.nav.recruitments,
        category: t.categories.services,
        href: "/recruitments",
        keywords: "recruit recruter interviews entretiens emails",
        icon: <AtlasoftRecruitIcon size={16} />,
      },
      {
        label: t.nav.users,
        category: t.categories.admin,
        href: "/admin",
        keywords: "admin roles permissions users utilisateurs",
        adminOnly: true,
        icon: <AtlasoftAdminUsersIcon size={16} />,
      },
      {
        label: t.nav.invitations,
        category: t.categories.admin,
        href: "/invitations",
        keywords: "invite inviter recruiters recruteurs links liens invitations",
        adminOnly: true,
        icon: <AtlasoftInviteIcon size={16} />,
      },
      {
        label: t.nav.profile,
        category: t.categories.account,
        href: "/profile",
        keywords: "profile profil avatar password mot de passe",
        icon: <AtlasoftProfileIcon size={16} />,
      },
      {
        label: t.nav.settings,
        category: t.categories.account,
        href: "/settings",
        keywords: "settings parametres preferences notifications security language theme",
        icon: <AtlasoftSettingsIcon size={16} />,
      },
      {
        label: t.nav.helpGuide,
        category: t.categories.help,
        href: "/help",
        keywords: "help aide documentation support guide",
        icon: <AtlasoftHelpIcon size={16} />,
      },
    ],
    [t]
  );

  const visibleItems = useMemo(() => {
    const allowed = quickNavItems.filter((item) => !item.adminOnly || isAdmin);
    const q = query.trim().toLowerCase();
    if (!q) return allowed;
    return allowed.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
    );
  }, [quickNavItems, isAdmin, query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = (href: string) => {
    setSearchFocused(false);
    setQuery("");
    router.push(href);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchFocused) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(visibleItems.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev - 1 < 0 ? Math.max(visibleItems.length - 1, 0) : prev - 1
      );
    } else if (e.key === "Enter" && visibleItems[selectedIndex]) {
      e.preventDefault();
      handleSelectItem(visibleItems[selectedIndex].href);
    } else if (e.key === "Escape") {
      setSearchFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <header
      className={`sticky top-0 flex h-10 w-full shrink-0 items-center justify-between border-b border-[#323130] bg-[#1b1a19] text-white font-atlasoft select-none ${
        isModalOpen ? "z-10" : "z-40"
      }`}
    >
      {/* Left: Hamburger + Brand */}
      <div className="flex h-full items-center shrink-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={
            sidebarOpen
              ? l("Réduire le menu", "Collapse menu")
              : l("Développer le menu", "Expand menu")
          }
          title={l("Menu de navigation", "Navigation menu")}
          className="flex h-10 w-12 items-center justify-center text-white transition-colors hover:bg-[#323130] focus:outline-none"
        >
          <Menu size={17} strokeWidth={1.75} />
        </button>

        <Link
          href="/dashboard"
          className="flex h-10 items-center gap-2 px-2.5 text-[15px] font-semibold tracking-[-0.01em] text-white transition-colors hover:bg-[#323130]"
        >
          <AtlasoftBrandMark size={26} />
          <span className="whitespace-nowrap">TalentFlow</span>
        </Link>
      </div>

      {/* Center: Global Search Bar */}
      <div className="relative mx-4 hidden max-w-[560px] flex-1 sm:block" ref={searchRef}>
        <div
          className={`flex h-[28px] w-full items-center rounded-[2px] border transition-colors ${
            searchFocused
              ? "border-[#0078d4] bg-white dark:bg-[#323130]"
              : "border-transparent bg-[#f3f2f1] hover:bg-white dark:bg-[#292827] dark:border-[#3b3a39] dark:hover:bg-[#323130]"
          }`}
        >
          <Search
            size={14}
            className={`ml-2.5 shrink-0 ${
              searchFocused ? "text-[#0078d4] dark:text-[#4ea8ff]" : "text-[#605e5c] dark:text-[#a19f9d]"
            }`}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
              setSearchFocused(true);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={l(
              "Rechercher des ressources, services et docs (Ctrl+/)",
              "Search resources, services, and docs (Ctrl+/)"
            )}
            aria-label={l(
              "Rechercher des ressources, services et docs",
              "Search resources, services, and docs"
            )}
            className="h-full w-full bg-transparent px-2.5 text-[12.5px] text-[#323130] dark:text-[#f3f2f1] placeholder:text-[#605e5c] dark:placeholder:text-[#a19f9d] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={l("Effacer la recherche", "Clear search")}
              className="mr-1.5 flex h-5 w-5 items-center justify-center rounded-[2px] text-[#605e5c] dark:text-[#a19f9d] hover:bg-[#edebe9] dark:hover:bg-[#3b3a39] hover:text-[#323130] dark:hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {searchFocused && (
          <div className="absolute left-0 right-0 top-full z-50 mt-0.5 max-h-80 overflow-y-auto rounded-[2px] border border-[#edebe9] dark:border-[#3b3a39] bg-white dark:bg-[#252423] py-1 text-[#323130] dark:text-[#f3f2f1] shadow-xl">
            <div className="border-b border-[#edebe9] dark:border-[#3b3a39] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#605e5c] dark:text-[#a19f9d]">
              {query.trim() ? l("Résultats", "Results") : l("Services et ressources", "Services and resources")}
            </div>
            {visibleItems.length === 0 ? (
              <p className="px-3 py-4 text-center text-[12px] text-[#605e5c] dark:text-[#a19f9d]">
                {l(
                  `Aucun service correspondant à « ${query} ».`,
                  `No service matching "${query}".`
                )}
              </p>
            ) : (
              visibleItems.map((item, idx) => (
                <button
                  key={item.href}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleSelectItem(item.href)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] transition-colors ${
                    idx === selectedIndex
                      ? "bg-[#eff6fc] dark:bg-[#0078d4]/25 text-[#323130] dark:text-white"
                      : "hover:bg-[#f3f2f1] dark:hover:bg-[#323130]"
                  }`}
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  <span className="text-[11px] text-[#605e5c] dark:text-[#a19f9d]">{item.category}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right: Utility Icons + Account */}
      <div className="flex h-full items-center shrink-0">
        <SystemJobs />
        <NotificationButton />
        <Link
          href="/settings"
          title={t.nav.settings}
          aria-label={t.nav.settings}
          className="flex h-10 w-10 items-center justify-center text-white transition-colors hover:bg-[#323130]"
        >
          <Settings size={16} strokeWidth={1.75} />
        </Link>
        <Link
          href="/help"
          title={t.nav.help}
          aria-label={t.nav.help}
          className="hidden h-10 w-10 items-center justify-center text-white transition-colors hover:bg-[#323130] sm:flex"
        >
          <HelpCircle size={16} strokeWidth={1.75} />
        </Link>
        <ProfileSection variant="topbar" />
      </div>
    </header>
  );
}
