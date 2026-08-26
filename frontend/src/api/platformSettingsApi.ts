/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';

export interface PlatformSettingsResponse {
  configured: boolean;
  smtpHost: string | null;
  smtpPort: number;
  smtpUsername: string | null;
  fromAddress: string | null;
  enabled: boolean;
  passwordSet: boolean;
  appBaseUrl: string | null;
  platformName: string | null;
  supportEmail: string | null;
  require2fa: boolean;
  /** Read-only — reflects the running server's JWT config, not admin-editable here. */
  sessionExpirationMinutes: number;
  lastTestAt: string | null;
  lastTestSuccess: boolean | null;
  lastTestMessage: string | null;
  stripePublishableKey: string | null;
  stripeSecretKeySet: boolean;
  stripeWebhookSecretSet: boolean;
  stripeEnabled: boolean;
}

export interface UpdatePlatformSettingsRequest {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  /** Blank keeps the existing stored password. */
  password: string;
  fromAddress: string;
  enabled: boolean;
  appBaseUrl: string;
  platformName: string;
  supportEmail: string;
  require2fa: boolean;
  stripePublishableKey: string;
  /** Blank keeps the existing stored secret key. */
  stripeSecretKey: string;
  /** Blank keeps the existing stored webhook secret. */
  stripeWebhookSecret: string;
  stripeEnabled: boolean;
}

export interface TestEmailResponse {
  success: boolean;
  message: string;
}

export const platformSettingsApi = {
  get: () => apiClient.get<PlatformSettingsResponse>('/api/v1/admin/platform-settings'),

  update: (data: UpdatePlatformSettingsRequest) =>
    apiClient.put<PlatformSettingsResponse>('/api/v1/admin/platform-settings', data),

  sendTest: () => apiClient.post<TestEmailResponse>('/api/v1/admin/platform-settings/test'),
};
