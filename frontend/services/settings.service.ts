import api from "@/lib/axios";

export interface NotificationPreferences {
  email_new_candidate: boolean;
  email_invitation_accepted: boolean;
  email_system_updates: boolean;
}

export interface UIPreferences {
  theme: "light" | "dark" | "system";
  language: "fr" | "en";
  items_per_page: number;
}

export interface UserSettings {
  notification_preferences: NotificationPreferences;
  preferences: UIPreferences;
}

export const SettingsService = {
  get: async (): Promise<UserSettings> => {
    const response = await api.get("/settings");
    return response.data;
  },
  update: async (data: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await api.put("/settings", data);
    return response.data;
  },
};
