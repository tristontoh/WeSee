/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';
import { CompanyResponse } from './companyApi';
import { TenantUserResponse } from './tenantAdminApi';

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
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
