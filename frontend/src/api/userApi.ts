/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';

export interface UserProfileResponse {
  userId: string;
  name: string;
  email: string;
  role: 'COMPANY_ADMIN' | 'COMPANY_CONTRIBUTOR' | 'CONSULTANT' | 'PLATFORM_ADMIN' | 'SUPERADMIN';
  companyName: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  bio: string | null;
  avatarColor: string;
  memberSince: string;
}

export interface UpdateUserProfileRequest {
  name: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const userApi = {
  getMyProfile: () => apiClient.get<UserProfileResponse>('/api/v1/users/me'),

  updateMyProfile: (request: UpdateUserProfileRequest) =>
    apiClient.patch<UserProfileResponse>('/api/v1/users/me', request),

  changePassword: (request: ChangePasswordRequest) =>
    apiClient.post<void>('/api/v1/users/me/change-password', request),
};
