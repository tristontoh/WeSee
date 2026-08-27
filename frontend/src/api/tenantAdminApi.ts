/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';
import { BackendMarketClassification, BackendSubscriptionPlan } from './mappers';

export interface TenantSummaryResponse {
  id: string;
  name: string;
  sectorCode: string | null;
  marketClassification: BackendMarketClassification;
  subscriptionPlan: BackendSubscriptionPlan;
  active: boolean;
  createdAt: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  trialEndsAt: string | null;
  trialConverted: boolean;
}

export type BackendRole = 'COMPANY_ADMIN' | 'COMPANY_CONTRIBUTOR' | 'CONSULTANT' | 'PLATFORM_ADMIN' | 'SUPERADMIN';

export interface TenantUserResponse {
  id: string;
  name: string;
  email: string;
  role: BackendRole;
  customRoleId: string | null;
  customRoleName: string | null;
  active: boolean;
  createdAt: string;
}

export const tenantAdminApi = {
  list: () => apiClient.get<TenantSummaryResponse[]>('/api/v1/admin/tenants'),

  updatePlan: (id: string, plan: BackendSubscriptionPlan) =>
    apiClient.patch<TenantSummaryResponse>(`/api/v1/admin/tenants/${id}/plan`, { plan }),

  updateStatus: (id: string, active: boolean) =>
    apiClient.patch<TenantSummaryResponse>(`/api/v1/admin/tenants/${id}/status`, { active }),

  updateTrial: (id: string, converted: boolean) =>
    apiClient.patch<TenantSummaryResponse>(`/api/v1/admin/tenants/${id}/trial`, { converted }),

  listUsers: (id: string) => apiClient.get<TenantUserResponse[]>(`/api/v1/admin/tenants/${id}/users`),
};
