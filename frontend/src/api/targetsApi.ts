/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export interface PerformanceTargetResponse {
  id: string;
  title: string;
  description: string | null;
  baselineYear: number;
  targetYear: number;
  targetValue: number;
  currentProgress: number;
  indicatorId: string | null;
  /** True when currentProgress was computed live from real indicator data rather than manually entered. */
  progressComputed: boolean;
  horizon: 'NEAR_TERM' | 'LONG_TERM';
}

export interface UpsertPerformanceTargetRequest {
  title: string;
  description?: string;
  baselineYear: number;
  targetYear: number;
  targetValue: number;
  currentProgress?: number;
  indicatorId?: string;
  horizon?: 'NEAR_TERM' | 'LONG_TERM';
}

export const targetsApi = {
  list: () => apiClient.get<PerformanceTargetResponse[]>('/api/v1/targets'),

  get: (id: string) => apiClient.get<PerformanceTargetResponse>(`/api/v1/targets/${id}`),

  create: (data: UpsertPerformanceTargetRequest) => apiClient.post<PerformanceTargetResponse>('/api/v1/targets', data),

  update: (id: string, data: UpsertPerformanceTargetRequest) =>
    apiClient.put<PerformanceTargetResponse>(`/api/v1/targets/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/api/v1/targets/${id}`),
};
