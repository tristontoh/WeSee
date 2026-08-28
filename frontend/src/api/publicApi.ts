/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';
import { BackendSubscriptionPlan } from './mappers';

export interface PublicPlanPricing {
  plan: BackendSubscriptionPlan;
  /** Ringgit per month on a monthly subscription. */
  monthlyPrice: number;
  /** Ringgit per month when billed annually — the discounted figure the toggle shows. */
  annualMonthlyPrice: number;
}

/**
 * The signed-out surface. `referenceApi` covers the same reference data for people who are logged
 * in; this exists because the pricing page is read before anyone has an account, and the
 * authenticated route answers 403 there.
 */
export const publicApi = {
  planPricing: () => apiClient.get<PublicPlanPricing[]>('/api/v1/public/plan-pricing'),
};
