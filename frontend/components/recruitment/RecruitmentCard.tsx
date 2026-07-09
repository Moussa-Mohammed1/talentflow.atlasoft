import { CalendarDays, Mail, User, UserPlus, Video } from "lucide-react";
import type { RecruitmentListItem } from "@/types/recruitment";
import { statusLabels, statusColors, priorityLabels, priorityColors } from "@/types/recruitment";

const storage_url = process.env.NEXT_PUBLIC_STORAGE_URL;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function RecruitmentCard({
  item,
  onView,
  onSendEmail,
}: {
  item: RecruitmentListItem;
  onView: () => void;
  onSendEmail: () => void;
}) {
  return (
    <div className="bg-white border border-slate-100 transition-all duration-300 flex flex-col overflow-hidden mrc">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {item.candidate?.photo ? (
            <img
              src={`${storage_url}${item.candidate.photo}`}
              alt={item.candidate.fullname}
              className="w-10 h-10 rounded-full object-cover object-top bg-slate-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-400 shrink-0">
              <User size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 truncate">
              {item.candidate?.fullname || "Inconnu"}
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              {item.job_offer?.title || "Aucun poste"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 mm px-2 py-0.5 text-[10px] font-medium ${statusColors[item.status]}`}>
            {statusLabels[item.status]}
          </span>
          <span className={`inline-flex items-center gap-1 mm px-2 py-0.5 text-[10px] font-medium ${priorityColors[item.priority]}`}>
            {priorityLabels[item.priority]}
          </span>
        </div>

        {item.compatibility_score !== null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.min(item.compatibility_score, 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-700 shrink-0">
              {item.compatibility_score.toFixed(0)}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <CalendarDays size={11} />
            {formatDate(item.created_at)}
          </span>
          {item.assigned_recruiter && (
            <span className="flex items-center gap-1 truncate max-w-[120px]">
              <UserPlus size={11} />
              {item.assigned_recruiter.fullname}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex-1 text-[11px] font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 py-1.5 rounded transition-colors cursor-pointer"
          >
            Voir
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSendEmail(); }}
            className="flex-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 py-1.5 rounded transition-colors cursor-pointer"
          >
            <Mail size={12} className="inline mr-1" />
            Email
          </button>
         
        </div>
      </div>
    </div>
  );
}
