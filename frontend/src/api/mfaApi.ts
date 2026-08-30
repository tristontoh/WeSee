/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export interface TotpEnrollResponse {
  secret: string;
  qrCodeDataUri: string;
  otpauthUri: string;
}

export interface TotpStatusResponse {
  enabled: boolean;
  enabledAt: string | null;
}

export interface BackupCodesResponse {
  backupCodes: string[];
}

export const mfaApi = {
  status: () => apiClient.get<TotpStatusResponse>('/api/v1/mfa/totp/status'),

  enroll: () => apiClient.post<TotpEnrollResponse>('/api/v1/mfa/totp/enroll'),

  verify: (code: string) => apiClient.post<BackupCodesResponse>('/api/v1/mfa/totp/verify', { code }),

  disable: (password: string, code: string) =>
    apiClient.post<void>('/api/v1/mfa/totp/disable', { password, code }),

  regenerateBackupCodes: (password: string, code: string) =>
    apiClient.post<BackupCodesResponse>('/api/v1/mfa/backup-codes/regenerate', { password, code }),
};
