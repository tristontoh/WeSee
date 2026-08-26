/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';

export interface MonthlyUsageEntry {
  month: string;
  requestCount: number;
  successCount: number;
  inputTokens: number;
  outputTokens: number;
}

export interface UsageSummaryResponse {
  months: MonthlyUsageEntry[];
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export const aiUsageApi = {
  get: (months = 6) => apiClient.get<UsageSummaryResponse>('/api/v1/company/ai/usage', { months }),
};
