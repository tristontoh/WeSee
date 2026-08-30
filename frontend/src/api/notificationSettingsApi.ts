/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export interface NotificationPreferencesResponse {
  reportDeadlineReminders: boolean;
  teamActivityAlerts: boolean;
  complianceAlerts: boolean;
  weeklyDigest: boolean;
  updatedAt: string | null;
}

export interface UpdateNotificationPreferencesRequest {
  reportDeadlineReminders: boolean;
  teamActivityAlerts: boolean;
  complianceAlerts: boolean;
  weeklyDigest: boolean;
}

export const notificationSettingsApi = {
  get: () => apiClient.get<NotificationPreferencesResponse>('/api/v1/users/me/notification-preferences'),

  update: (data: UpdateNotificationPreferencesRequest) =>
    apiClient.patch<NotificationPreferencesResponse>('/api/v1/users/me/notification-preferences', data),
};
