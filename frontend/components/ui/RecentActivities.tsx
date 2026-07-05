"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Activity } from "@/types/activity";
import { activityService } from "@/services/activity.service";

function formatTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecentActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    activityService
      .list()
      .then((data) => {
        if (!cancelled) {
          setActivities(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Impossible de charger les activités récentes.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="b">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">
          Activités récentes
        </h2>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </div>
        )}

        {!isLoading && error && (
          <p className="py-8 text-center text-xs text-rose-600">{error}</p>
        )}

        {!isLoading && !error && activities.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500">
            Aucune activité récente.
          </p>
        )}

        {!isLoading &&
          !error &&
          (showAll ? activities : activities.slice(0, 3)).map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <p className="text-xs text-slate-700 leading-5">
                {activity.description}
              </p>
              <time
                dateTime={activity.created_at}
                className="mt-0.5 block text-[10px] text-slate-400"
              >
                {formatTime(activity.created_at)}
              </time>
            </div>
          ))}

        {!isLoading && !error && activities.length > 3 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full px-5 py-2 text-xs font-semibold text-indigo-600 hover:bg-slate-50 transition-colors"
          >
            Voir plus
          </button>
        )}

        {!isLoading && !error && activities.length > 3 && showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full px-5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Voir moins
          </button>
        )}
      </div>
    </div>
  );
}
