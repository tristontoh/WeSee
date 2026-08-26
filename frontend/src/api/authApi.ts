/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';
import { BackendMarketClassification, BackendSubscriptionPlan } from './mappers';

export interface MeResponse {
  userId: string;
  name: string;
  email: string;
  role: 'COMPANY_ADMIN' | 'COMPANY_CONTRIBUTOR' | 'CONSULTANT' | 'PLATFORM_ADMIN' | 'SUPERADMIN';
  companyId: string | null;
  companyName: string | null;
  sectorCode: string | null;
  market: BackendMarketClassification | null;
  plan: BackendSubscriptionPlan | null;
  onboardingCompleted: boolean;
  frameworks: string[];
  priorities: string[];
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  bio: string | null;
  hasAvatar: boolean;
  mfaSetupRequired: boolean;
  /** Absent on backends without a per-company RBAC layer — see permissions.hasPermission. */
  permissions?: string[];
}

export interface AuthResponse {
  token: string;
  user: MeResponse;
}

export interface LoginResponse {
  mfaRequired: boolean;
  mfaToken: string | null;
  emailVerificationRequired: boolean;
  auth: AuthResponse | null;
}

export interface RegisterResponse {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface InvitePreviewResponse {
  companyName: string;
  name: string;
  email: string;
  role: 'COMPANY_ADMIN' | 'COMPANY_CONTRIBUTOR' | 'CONSULTANT';
  invitedByName: string | null;
}

export const authApi = {
  register: (name: string, email: string, password: string, companyName: string) =>
    apiClient.post<RegisterResponse>('/api/v1/auth/register', { name, email, password, companyName }),

  login: (email: string, password: string, rememberMe: boolean) =>
    apiClient.post<LoginResponse>('/api/v1/auth/login', { email, password, rememberMe }),

  verifyMfa: (mfaToken: string, code: string) =>
    apiClient.post<AuthResponse>('/api/v1/auth/login/verify-mfa', { mfaToken, code }),

  verifyEmail: (token: string) => apiClient.post<void>('/api/v1/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    apiClient.post<ResendVerificationResponse>('/api/v1/auth/resend-verification', { email }),

  forgotPassword: (email: string) =>
    apiClient.post<ForgotPasswordResponse>('/api/v1/auth/forgot-password', { email }),

  validateResetToken: (token: string) => apiClient.get<void>(`/api/v1/auth/reset-password/${encodeURIComponent(token)}`),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<void>(`/api/v1/auth/reset-password/${encodeURIComponent(token)}`, { newPassword }),

  me: () => apiClient.get<MeResponse>('/api/v1/auth/me'),

  completeOnboarding: (data: {
    market: BackendMarketClassification;
    sectorCode?: string;
    frameworks: string[];
    priorities: string[];
  }) => apiClient.patch<MeResponse>('/api/v1/auth/onboarding', data),

  previewInvite: (token: string) => apiClient.get<InvitePreviewResponse>(`/api/v1/auth/invites/${token}`),

  acceptInvite: (token: string, name: string, password: string) =>
    apiClient.post<AuthResponse>(`/api/v1/auth/invites/${token}/accept`, { name, password }),

  updateProfile: (data: { name: string; email: string; phone: string; dateOfBirth: string | null; address: string; bio: string }) =>
    apiClient.patch<MeResponse>('/api/v1/auth/profile', data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postFile<MeResponse>('/api/v1/auth/profile/avatar', formData);
  },

  avatarUrl: () => apiClient.getBlob('/api/v1/auth/profile/avatar'),

  removeAvatar: () => apiClient.delete<MeResponse>('/api/v1/auth/profile/avatar'),
};
