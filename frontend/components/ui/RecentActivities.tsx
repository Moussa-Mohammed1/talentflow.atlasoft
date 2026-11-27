"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Activity } from "@/types/activity";
import { activityService } from "@/services/activity.service";
import { useLanguage } from "@/context/LanguageContext";

function formatTime(value: string, language: "fr" | "en", locale: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (language === "en") {
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
  } else {
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
  }
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecentActivities() {
  const { language, locale, l } = useLanguage();
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
          setError(
            l(
              "Impossible de charger les activités récentes.",
              "Unable to load recent activities."
            )
          );
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [l]);

  return (
    <div className="b">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-[#3b3a39]">
        <h2 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1]">
          {l("Activités récentes", "Recent activities")}
        </h2>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-[#3b3a39]">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-[#a19f9d]">
            <Loader2 className="h-4 w-4 animate-spin" /> {l("Chargement...", "Loading...")}
          </div>
        )}

        {!isLoading && error && (
          <p className="py-8 text-center text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}

        {!isLoading && !error && activities.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500 dark:text-[#a19f9d]">
            {l("Aucune activité récente.", "No recent activity.")}
          </p>
        )}

        {!isLoading &&
          !error &&
          (showAll ? activities : activities.slice(0, 3)).map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#323130] transition-colors"
            >
              <p className="text-xs text-slate-700 dark:text-[#e1dfdd] leading-5">
                {activity.description}
              </p>
              <time
                dateTime={activity.created_at}
                className="mt-0.5 block text-[10px] text-slate-400 dark:text-[#a19f9d]"
              >
                {formatTime(activity.created_at, language, locale)}
              </time>
            </div>
          ))}

        {!isLoading && !error && activities.length > 3 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full px-5 py-2 text-xs font-semibold text-indigo-600 dark:text-[#4ea8ff] hover:bg-slate-50 dark:hover:bg-[#323130] transition-colors"
          >
            {l("Voir plus", "Show more")}
          </button>
        )}

        {!isLoading && !error && activities.length > 3 && showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full px-5 py-2 text-xs font-semibold text-slate-500 dark:text-[#a19f9d] hover:bg-slate-50 dark:hover:bg-[#323130] transition-colors"
          >
            {l("Voir moins", "Show less")}
          </button>
        )}
      </div>
    </div>
  );
}
