import { useState } from "react";
import { ChevronRight, User, Settings, LogOut, Loader2 } from "lucide-react";
import { AuthService } from "@/services/auth.service";
interface ProfileSectionProps {
    collapsed: boolean;
}

export default function ProfileSection({
    collapsed,
}: ProfileSectionProps) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    const [isOpen, setIsOpen] = useState(false);
 
    const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => { 
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsOpen(false);
        }
    };

    return (
        <div 
            className="relative w-full outline-none"
            tabIndex={0} 
            onBlur={handleBlur}
        >
            
             
            <div
                className={`
                    absolute bottom-full left-0 w-full bg-white border border-slate-100 
                    rounded-lg shadow-lg p-1.5 mb-2 flex flex-col gap-0.5
                    transition-all duration-200 z-50 origin-bottom
                    ${
                        isOpen 
                            ? "visible opacity-100 translate-y-0 scale-100" 
                            : "invisible opacity-0 translate-y-2 scale-95"
                    }
                `}
            >
                <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors cursor-pointer text-left">
                    <User size={14} className="text-slate-400" />
                    <span className={`${collapsed ? "hidden group-hover/sidebar:block" : "block"}`}>
                        Mon Profil
                    </span>
                </button>
                
                <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors cursor-pointer text-left">
                    <Settings size={14} className="text-slate-400" />
                    <span className={`${collapsed ? "hidden group-hover/sidebar:block" : "block"}`}>
                        Paramètres
                    </span>
                </button>

                <div className="h-px bg-slate-100 my-1" />

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="
                        w-full flex items-center gap-2 px-2.5 py-2 text-xs
                        text-rose-600 hover:bg-rose-50 rounded-md
                        transition-colors cursor-pointer font-medium text-left
                        disabled:opacity-70 disabled:cursor-not-allowed
                    "
                >
                    <LogOut size={14} />

                    <div className="flex items-center gap-2">
                        <span
                            className={`${
                                collapsed
                                    ? "hidden group-hover/sidebar:block"
                                    : "block"
                            }`}
                        >
                            Déconnexion
                        </span>

                        {isLoggingOut && (
                            <Loader2
                                size={12}
                                className="animate-spin"
                            />
                        )}
                    </div>
                </button>
            </div>

            
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center rounded-md text-xs font-medium cursor-pointer
                    text-slate-700 hover:bg-slate-50 transition-all duration-300
                    ${
                        collapsed
                            ? "justify-center px-0 py-2 group-hover/sidebar:justify-between group-hover/sidebar:px-2"
                            : "justify-between px-2 py-1.5"
                    }
                    ${isOpen ? "bg-slate-50 text-slate-900" : ""}
                `}
            >
                <div className="flex items-center gap-2.5">
                     
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-[10px] shrink-0">
                        MM
                    </div>

                     
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
                        Profil et paramètres
                    </span>
                </div>

               
                <ChevronRight
                    size={14}
                    className={`
                        text-slate-400 transition-all duration-300 shrink-0
                        ${isOpen ? "-rotate-90 text-slate-600" : ""}
                        ${
                            collapsed
                                ? "opacity-0 w-0 overflow-hidden group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto"
                                : "opacity-100"
                        }
                    `}
                />
            </button>
        </div>
    );
}