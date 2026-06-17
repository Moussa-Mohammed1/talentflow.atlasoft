import { Bell } from "lucide-react"

export default function NotificationButton()
{
    return (
        <button className="relative  p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-full transition-all">
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600"></span>
              <Bell size={18} />
        </button>
    )
}