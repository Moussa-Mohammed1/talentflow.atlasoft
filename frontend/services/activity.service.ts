import api from "@/lib/axios";
import type { Activity } from "@/types/activity";

export const activityService = {
  async list(limit = 20): Promise<Activity[]> {
    const response = await api.get<{ items: Activity[] }>("/activities", {
      params: { limit },
    });
    return response.data.items;
  },
};
