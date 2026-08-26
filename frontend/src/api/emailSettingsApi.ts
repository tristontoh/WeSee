/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';

export interface EmailSettingsResponse {
  configured: boolean;
  smtpHost: string | null;
  smtpPort: number;
  smtpUsername: string | null;
  fromAddress: string | null;
  enabled: boolean;
  passwordSet: boolean;
  lastTestAt: string | null;
  lastTestSuccess: boolean | null;
  lastTestMessage: string | null;
}

export interface UpdateEmailSettingsRequest {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  /** Blank keeps the existing stored password. */
  password: string;
  fromAddress: string;
  enabled: boolean;
}

export interface TestEmailResponse {
  success: boolean;
  message: string;
}

export const emailSettingsApi = {
  get: () => apiClient.get<EmailSettingsResponse>('/api/v1/company/email-settings'),

  update: (data: UpdateEmailSettingsRequest) =>
    apiClient.put<EmailSettingsResponse>('/api/v1/company/email-settings', data),

  sendTest: () => apiClient.post<TestEmailResponse>('/api/v1/company/email-settings/test'),
};
