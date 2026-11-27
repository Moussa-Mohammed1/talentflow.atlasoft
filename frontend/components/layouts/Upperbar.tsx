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

const QUICK_NAV_ITEMS: QuickNavItem[] = [
  {
    label: "Accueil",
    category: "Services",
    href: "/dashboard",
    keywords: "dashboard home tableau de bord",
    icon: <AtlasoftHomeIcon size={16} />,
  },
  {
    label: "Resources",
    category: "Services",
    href: "/resources",
    keywords: "ressources configuration",
    icon: <AtlasoftResourcesIcon size={16} />,
  },
  {
    label: "Départements",
    category: "Resources",
    href: "/resources/departements",
    keywords: "departements equipes competences",
    icon: <AtlasoftDepartmentsIcon size={16} />,
  },
  {
    label: "Documents",
    category: "Services",
    href: "/documents",
    keywords: "cv resume fichiers importer",
    icon: <AtlasoftDocumentsIcon size={16} />,
  },
  {
    label: "Évaluations",
    category: "Services",
    href: "/evaluations",
    keywords: "scores candidats analyse ia",
    icon: <AtlasoftEvaluationsIcon size={16} />,
  },
  {
    label: "Offres d'emploi",
    category: "Services",
    href: "/jobs",
    keywords: "postes jobs recrutement offres",
    icon: <AtlasoftJobsIcon size={16} />,
  },
  {
    label: "Talents",
    category: "Services",
    href: "/talents",
    keywords: "candidats profils favoris",
    icon: <AtlasoftTalentsIcon size={16} />,
  },
  {
    label: "Recrutements",
    category: "Services",
    href: "/recruitments",
    keywords: "recruter entretiens emails",
    icon: <AtlasoftRecruitIcon size={16} />,
  },
  {
    label: "Utilisateurs",
    category: "Administration",
    href: "/admin",
    keywords: "admin roles permissions",
    adminOnly: true,
    icon: <AtlasoftAdminUsersIcon size={16} />,
  },
  {
    label: "Invitations",
    category: "Administration",
    href: "/invitations",
    keywords: "inviter recruteurs liens",
    adminOnly: true,
    icon: <AtlasoftInviteIcon size={16} />,
  },
  {
    label: "Mon Profil",
    category: "Compte",
    href: "/profile",
    keywords: "profil avatar mot de passe",
    icon: <AtlasoftProfileIcon size={16} />,
  },
  {
    label: "Paramètres",
    category: "Compte",
    href: "/settings",
    keywords: "settings preferences notifications securite",
    icon: <AtlasoftSettingsIcon size={16} />,
  },
  {
    label: "Guide d'utilisation",
    category: "Aide",
    href: "/help",
    keywords: "help documentation support",
    icon: <AtlasoftHelpIcon size={16} />,
  },
];

interface UpperbarProps {
  onToggleSidebar: () => void;
  sidebarOpen?: boolean;
}

export default function Upperbar({ onToggleSidebar, sidebarOpen = true }: UpperbarProps) {
  const router = useRouter();
  const currentUserRole = useAuthStore((s) => s.user?.role);
  const { isModalOpen } = useModal();
  const isAdmin = currentUserRole?.toLowerCase() === "admin";

  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleItems = useMemo(() => {
    const allowed = QUICK_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
    const q = query.trim().toLowerCase();
    if (!q) return allowed;
    return allowed.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
    );
  }, [isAdmin, query]);

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
          aria-label={sidebarOpen ? "Réduire le menu" : "Développer le menu"}
          title="Menu de navigation"
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
              ? "border-[#0078d4] bg-white"
              : "border-transparent bg-[#f3f2f1] hover:bg-white"
          }`}
        >
          <Search
            size={14}
            className={`ml-2.5 shrink-0 ${searchFocused ? "text-[#0078d4]" : "text-[#605e5c]"}`}
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
            placeholder="Rechercher des ressources, services et docs (Ctrl+/)"
            aria-label="Rechercher des ressources, services et docs"
            className="h-full w-full bg-transparent px-2.5 text-[12.5px] text-[#323130] placeholder:text-[#605e5c] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="mr-1.5 flex h-5 w-5 items-center justify-center rounded-[2px] text-[#605e5c] hover:bg-[#edebe9] hover:text-[#323130]"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {searchFocused && (
          <div className="absolute left-0 right-0 top-full z-50 mt-0.5 max-h-80 overflow-y-auto rounded-[2px] border border-[#edebe9] bg-white py-1 text-[#323130] shadow-xl">
            <div className="border-b border-[#edebe9] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">
              {query.trim() ? "Résultats" : "Services et ressources"}
            </div>
            {visibleItems.length === 0 ? (
              <p className="px-3 py-4 text-center text-[12px] text-[#605e5c]">
                Aucun service correspondant à « {query} ».
              </p>
            ) : (
              visibleItems.map((item, idx) => (
                <button
                  key={item.href}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleSelectItem(item.href)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] transition-colors ${
                    idx === selectedIndex ? "bg-[#eff6fc] text-[#323130]" : "hover:bg-[#f3f2f1]"
                  }`}
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  <span className="text-[11px] text-[#605e5c]">{item.category}</span>
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
          title="Paramètres"
          aria-label="Paramètres"
          className="flex h-10 w-10 items-center justify-center text-white transition-colors hover:bg-[#323130]"
        >
          <Settings size={16} strokeWidth={1.75} />
        </Link>
        <Link
          href="/help"
          title="Aide"
          aria-label="Aide"
          className="hidden h-10 w-10 items-center justify-center text-white transition-colors hover:bg-[#323130] sm:flex"
        >
          <HelpCircle size={16} strokeWidth={1.75} />
        </Link>
        <ProfileSection variant="topbar" />
      </div>
    </header>
  );
}
