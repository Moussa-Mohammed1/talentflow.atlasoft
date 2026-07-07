import api from "@/lib/axios";
import type { AcceptInvitationRequest, AcceptInvitationResponse, DeleteInvitationResponse, Invitation, InviteUserResponse, ValidateInvitationResponse } from "@/types/invitation";

export const InvitationService = {
  getAll: async (): Promise<Invitation[]> => {
    const response = await api.get<Invitation[]>("/auth/invitations");
    return response.data;
  },

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

  delete: async (id: number): Promise<DeleteInvitationResponse> => {
    const response = await api.delete<DeleteInvitationResponse>(`/auth/invitations/${id}`);
    return response.data;
  },
};
