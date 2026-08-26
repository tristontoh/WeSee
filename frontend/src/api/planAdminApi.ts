/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';
import { BackendSubscriptionPlan } from './mappers';
import { FeatureFlagResponse } from './referenceApi';

export interface PlanPricingResponse {
  plan: BackendSubscriptionPlan;
  monthlyPrice: number;
}

export const planAdminApi = {
  listPricing: () => apiClient.get<PlanPricingResponse[]>('/api/v1/admin/plan-pricing'),

  updatePricing: (plan: BackendSubscriptionPlan, monthlyPrice: number) =>
    apiClient.patch<PlanPricingResponse>(`/api/v1/admin/plan-pricing/${plan}`, { monthlyPrice }),

  listFeatureFlags: () => apiClient.get<FeatureFlagResponse[]>('/api/v1/admin/reference/features'),

  updateFeatureFlag: (featureKey: string, minPlan: BackendSubscriptionPlan, visibleOnlyAtMinPlan: boolean) =>
    apiClient.patch<FeatureFlagResponse>(`/api/v1/admin/reference/features/${featureKey}`, { minPlan, visibleOnlyAtMinPlan }),
};
