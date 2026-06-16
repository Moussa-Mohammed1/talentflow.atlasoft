import Image from "next/image";
import { useState } from "react";
import ProfileSection from "../user/ProfileSection";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    ChevronRight,
    ChevronLeft,
    Home,
    Briefcase, 
    Users,
    CheckSquare,
    Building2,
    FolderOpen,
    MailPlus,
} from "lucide-react";
import { href } from "react-router-dom";
import { useModal } from "@/context/ModalContext";
export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(true);
    const pathname = usePathname();
    const { isModalOpen } = useModal();
    if(isModalOpen) return null;
    const sidebarItems = [
      { icon: <Home size={16} />, label: "Accueil",href: "/dashboard",  active: true },
      { icon: <Users size={16} />, label: "Talents", href: "/talents" },
      { icon: <Briefcase size={16} />, label: "Recrutement", href: "/recrutement" },
      { icon: <CheckSquare size={16} />, label: "Évaluations", href: "/evaluations" },
      { icon: <Building2 size={16} />, label: "Resources", href: "/resources" },
      { icon: <FolderOpen size={16} />, label: "Documents", href: "/documents" },
      { icon: <MailPlus size={16} />, label: "Inviter", href: "/inviter" },
    ];

    return (
      <>
        {/* 1. BACKDROP MOBILE */}
        {!collapsed && (
          <div 
            className="fixed inset-0 bg-slate-900/20 z-40 md:hidden transition-opacity"
            onClick={() => setCollapsed(true)}
          />
        )}

        
        <div 
          className={`shrink-0 h-screen sticky top-0 z-40 transition-all duration-300 group/sidebar ${
            collapsed ? "w-16 md:hover:w-56" : "w-0 md:w-56"
          }`}
        >
          
          {/* 3. COMPOSANT SIDEBAR EFFECTIF */}
          <aside
            className={`
              bg-white border-r border-slate-100 flex flex-col justify-between p-3 h-screen top-0 left-0 transition-all duration-300
              ${collapsed 
                ? "absolute w-16 group-hover/sidebar:w-56 z-50 shadow-md group-hover/sidebar:shadow-xl md:shadow-none" 
                : "fixed md:sticky w-56 z-50 shadow-xl md:shadow-none"
              }
            `}
          >    
            <div>
              {/* Logo Brand */}
              <div className="flex items-center justify-between px-1.5 py-3 mb-2 select-none">
                <Image
                  src="/images/logo.png"
                  alt="3GCOM Logo"
                  width={40}
                  height={20}
                  className="object-contain"
                  priority
                />

                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className={`
                    p-1 rounded cursor-pointer hover:bg-slate-200 bg-slate-100 transition-all
                    ${collapsed ? "opacity-0 group-hover/sidebar:opacity-100" : "opacity-100"}
                  `}
                >
                  {collapsed ? (
                    <ChevronRight size={18} />
                  ) : (
                    <ChevronLeft size={18} />
                  )}
                </button>
              </div>

              {/* Navigation Menus */}
              <nav className="space-y-0.5">
                {sidebarItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    className={`w-full flex items-center px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-slate-50 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}

                      <span
                        className={`
                          whitespace-nowrap transition-all duration-300
                          ${
                            collapsed
                              ? "opacity-0 w-0 overflow-hidden group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto"
                              : "opacity-100"
                          }
                        `}
                      >
                        {item.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Sidebar Footer */}
           
            <div className="border-t border-slate-100  pt-3 w-full">
            <ProfileSection collapsed={collapsed} />
            </div>
          </aside>
        </div>
      </>
    );
}