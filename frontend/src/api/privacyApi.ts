/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';
import { CompanyResponse } from './companyApi';
import { TenantUserResponse } from './tenantAdminApi';
import { saveText } from '../utils/download';

export interface PrivacyConsentResponse {
  marketingConsent: boolean;
  analyticsConsent: boolean;
  consentUpdatedAt: string | null;
}

export interface CompanyDataExportResponse {
  exportedAt: string;
  company: CompanyResponse;
  teamMembers: TenantUserResponse[];
  indicators: unknown[];
  materialityAssessments: unknown[];
  governanceStructure: unknown[];
  governanceOwnership: unknown[];
  compliancePolicies: unknown[];
  targets: unknown[];
  signOffRecords: unknown[];
}

export const privacyApi = {
  getConsent: () => apiClient.get<PrivacyConsentResponse>('/api/v1/privacy/consent'),

  updateConsent: (marketingConsent: boolean, analyticsConsent: boolean) =>
    apiClient.patch<PrivacyConsentResponse>('/api/v1/privacy/consent', { marketingConsent, analyticsConsent }),

  exportData: () => apiClient.get<CompanyDataExportResponse>('/api/v1/privacy/data-export'),

  closeAccount: (confirmCompanyName: string) =>
    apiClient.post<void>('/api/v1/privacy/close-account', { confirmCompanyName }),
};

export function downloadJson(data: unknown, filename: string) {
  saveText(JSON.stringify(data, null, 2), filename, 'application/json');
}
