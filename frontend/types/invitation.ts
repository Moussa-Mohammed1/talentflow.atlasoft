export interface Invitation {
  id: number;
  email: string;
  accepted: boolean;
  expires_at: string;
  invited_by_name: string;
  created_at: string;
}

export type InvitationStatus = "pending" | "accepted" | "expired";

export interface InviteUserRequest {
  email: string;
}

export interface InviteUserResponse {
  message: string;
  email: string;
}

export interface AcceptInvitationRequest {
  token: string;
  fullname: string;
  password: string;
}

export interface AcceptInvitationResponse {
  message: string;
}

export interface ValidateInvitationResponse {
  email: string;
  valid: boolean;
}

export interface DeleteInvitationResponse {
  message: string;
}
