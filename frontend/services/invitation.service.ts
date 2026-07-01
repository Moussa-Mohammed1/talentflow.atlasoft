import api from "@/lib/axios";
import type { AcceptInvitationRequest, AcceptInvitationResponse, InviteUserResponse, ValidateInvitationResponse } from "@/types/invitation";

export const InvitationService = {
  invite: async (email: string): Promise<InviteUserResponse> => {
    const response = await api.post<InviteUserResponse>("/auth/invite", { email });
    return response.data;
  },

  validateInvitation: async (token: string): Promise<ValidateInvitationResponse> => {
    const response = await api.get<ValidateInvitationResponse>(`/auth/invite/${token}`);
    return response.data;
  },

  acceptInvitation: async (data: AcceptInvitationRequest): Promise<AcceptInvitationResponse> => {
    const response = await api.post<AcceptInvitationResponse>("/auth/accept-invite", data);
    return response.data;
  },
};
