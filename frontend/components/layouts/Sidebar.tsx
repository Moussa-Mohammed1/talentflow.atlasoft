import Image from "next/image";
import { useState, useEffect } from "react";
import ProfileSection from "../user/ProfileSection";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Menu,
    X,
    ChevronRight,
    ChevronLeft,
    Home,
    Briefcase, 
    Users,
    CheckSquare,
    Building2,
    FolderOpen,
    MailPlus,
    LampDesk,
    HelpingHand,
    HelpingHandIcon,
    Info,
    BadgeQuestionMarkIcon,
} from "lucide-react";
import { useModal } from "@/context/ModalContext";

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();
    const { isModalOpen } = useModal();
    
    useEffect(() => {
      setMobileOpen(false);
    }, [pathname]);

    if(isModalOpen) return null;

    const sidebarItems = [
      { icon: <Home size={16} />, label: "Accueil", href: "/dashboard", active: true },
      { icon: <Users size={16} />, label: "Talents", href: "/talents" },
      { icon: <Briefcase size={16} />, label: "Offre d'emploi", href: "/jobs" },
      { icon: <LampDesk size={16} />, label: "Recruter", href: "/recrutement" },
      { icon: <CheckSquare size={16} />, label: "Évaluations", href: "/evaluations" },
      { icon: <Building2 size={16} />, label: "Resources", href: "/resources" },
      { icon: <FolderOpen size={16} />, label: "Documents", href: "/documents" },
      { icon: <MailPlus size={16} />, label: "Inviter", href: "/invitations" },
      { icon: <BadgeQuestionMarkIcon size={16} />, label: "Aide", href: "/help" },
    ];

    return (
      <>
        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 md:hidden p-2  bg-white border border-slate-200 shadow-md hover:bg-slate-50 transition-colors cursor-pointer"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/20 z-40 md:hidden transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar overlay */}
        <aside className={`
          fixed md:hidden top-0 left-0 z-50 h-screen bg-white border-r border-slate-100 flex flex-col justify-between p-3
          transition-transform duration-300 ease-in-out w-56 shadow-xl
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div>
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
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded cursor-pointer hover:bg-slate-200 bg-slate-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-0.5">
              {sidebarItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className={`w-full flex items-center focus:scale-95 px-2.5 py-2  text-xs font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-slate-200 text-slate-900 border-l-3 border-l-blue-500"
                      : "text-slate-600 hover:bg-slate-200 hover:text-black duration-500"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
            </nav>
          </div>

          <div className="border-t border-slate-100 pt-3 w-full">
            <ProfileSection collapsed={false} />
          </div>
        </aside>

        {/* Desktop sidebar */}
        <div 
          className={`shrink-0 h-screen sticky top-0 z-40 group/sidebar hidden md:block ${
            collapsed 
              ? "w-16 hover:w-56 transition-all duration-300 ease-in-out" 
              : "w-56 transition-none"
          }`}
        >
          <aside
            className={`
              bg-white border-r border-gray-500  flex flex-col justify-between  h-screen top-0 left-0
              ${collapsed 
                ? "absolute w-16 group-hover/sidebar:w-56 z-50   group-hover/sidebar:shadow-xl shadow-none transition-all duration-300 ease-in-out" 
                : "sticky w-56   transition-none"
              }
            `}
          >    
            <div>
              
              <div className="flex items-center justify-between py-3 px-4 my-2 select-none">
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

               
              <nav className="space-y-0.5">
                {sidebarItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    className={`w-full flex items-center focus:scale-99 focus:border px-5.5 py-2 text-xs font-medium transition-all ${
                      pathname === item.href
                        ? "bg-slate-200 text-slate-900 border-l-3 border-l-blue-500 "
                        : "text-slate-600 hover:bg-slate-200 hover:text-black duration-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}

                      <span
                        className={`
                          whitespace-nowrap
                          ${
                            collapsed
                              ? "opacity-0 w-0 overflow-hidden group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto transition-all duration-300 ease-in-out"
                              : "opacity-100 transition-none"
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
 
            <div className="border-t border-slate-100 py-3  w-full">
              <ProfileSection collapsed={collapsed} />
            </div>
          </aside>
        </div>
      </>
    );
}