/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';
import { BackendSubscriptionPlan } from './mappers';

export type MatterCategory = 'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE';
export type MatterSet = 'SEDG' | 'BURSA_MAIN' | 'BURSA_ACE' | 'SECTOR';
export type TargetDirection = 'UP' | 'DOWN';

export interface SectorResponse {
  code: string;
  name: string;
}

export interface MatterResponse {
  id: string;
  name: string;
  category: MatterCategory;
  description: string;
  matterSet: MatterSet;
}

export interface IndicatorDefinitionResponse {
  id: string;
  name: string;
  unit: string;
  matterId: string;
  category: MatterCategory;
  sectorSpecific: boolean;
  sectorCode: string | null;
  defaultTarget: number | null;
  defaultTargetDirection: TargetDirection | null;
}

export interface FeatureFlagResponse {
  featureKey: string;
  minPlan: BackendSubscriptionPlan;
  visibleOnlyAtMinPlan: boolean;
}

export interface PublicPlanPricingResponse {
  plan: BackendSubscriptionPlan;
  monthlyPrice: number;
}

export interface PermissionResponse {
  key: string;
  module: string;
  action: string;
  label: string;
  description: string | null;
}

export const referenceApi = {
  sectors: () => apiClient.get<SectorResponse[]>('/api/v1/reference/sectors'),

  matters: (set?: MatterSet) => apiClient.get<MatterResponse[]>('/api/v1/reference/matters', set ? { set } : undefined),

  applicableMatters: () => apiClient.get<MatterResponse[]>('/api/v1/reference/matters/applicable'),

  indicators: (matterId?: string) =>
    apiClient.get<IndicatorDefinitionResponse[]>('/api/v1/reference/indicators', matterId ? { matterId } : undefined),

  applicableIndicators: () => apiClient.get<IndicatorDefinitionResponse[]>('/api/v1/reference/indicators/applicable'),

  featureFlags: () => apiClient.get<FeatureFlagResponse[]>('/api/v1/reference/feature-flags'),

  planPricing: () => apiClient.get<PublicPlanPricingResponse[]>('/api/v1/reference/plan-pricing'),

  permissions: () => apiClient.get<PermissionResponse[]>('/api/v1/reference/permissions'),
};
