/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';
import { BackendSubscriptionPlan } from './mappers';
import { FeatureFlagResponse } from './referenceApi';

export interface PlanPricingResponse {
  plan: BackendSubscriptionPlan;
  monthlyPrice: number;
  annualMonthlyPrice: number;
}

export const planAdminApi = {
  listPricing: () => apiClient.get<PlanPricingResponse[]>('/api/v1/admin/plan-pricing'),

  updatePricing: (plan: BackendSubscriptionPlan, monthlyPrice: number, annualMonthlyPrice: number) =>
    apiClient.patch<PlanPricingResponse>(`/api/v1/admin/plan-pricing/${plan}`, { monthlyPrice, annualMonthlyPrice }),

  listFeatureFlags: () => apiClient.get<FeatureFlagResponse[]>('/api/v1/admin/reference/features'),

  updateFeatureFlag: (featureKey: string, minPlan: BackendSubscriptionPlan, visibleOnlyAtMinPlan: boolean) =>
    apiClient.patch<FeatureFlagResponse>(`/api/v1/admin/reference/features/${featureKey}`, { minPlan, visibleOnlyAtMinPlan }),
};
