/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';

export type ComplianceStatus = 'NOT_ESTABLISHED' | 'CURRENT' | 'DUE_SOON' | 'OVERDUE';

export interface CompliancePolicyResponse {
  id: string;
  policyKey: string | null;
  name: string;
  description: string | null;
  reviewCycleMonths: number;
  lastReviewedAt: string | null;
  nextReviewDueAt: string | null;
  documentUrl: string | null;
  status: ComplianceStatus;
  /** True for the Bursa/MACC-mandated defaults, which can't be deleted. */
  mandatory: boolean;
}

export interface CreateCompliancePolicyRequest {
  name: string;
  description?: string;
  reviewCycleMonths: number;
}

export const compliancePolicyApi = {
  list: () => apiClient.get<CompliancePolicyResponse[]>('/api/v1/governance/compliance-policies'),

  create: (data: CreateCompliancePolicyRequest) =>
    apiClient.post<CompliancePolicyResponse>('/api/v1/governance/compliance-policies', data),

  remove: (id: string) => apiClient.delete<void>(`/api/v1/governance/compliance-policies/${id}`),

  markReviewed: (id: string, documentUrl?: string) =>
    apiClient.patch<CompliancePolicyResponse>(`/api/v1/governance/compliance-policies/${id}/review`, { documentUrl }),
};
