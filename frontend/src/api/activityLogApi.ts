/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export type BackendActivityEventType =
  | 'SIGNUP' | 'PLAN_CHANGE' | 'SUPPORT_TICKET' | 'EXPORT_SUCCESS'
  | 'TRIAL_CONVERTED' | 'TRIAL_REVOKED';

export interface ActivityLogResponse {
  id: string;
  timestamp: string;
  companyId: string | null;
  companyName: string;
  eventType: BackendActivityEventType;
  description: string;
}

export const activityLogApi = {
  listRecent: (limit?: number) => apiClient.get<ActivityLogResponse[]>('/api/v1/admin/activity-log', limit ? { limit } : undefined),

  getById: (id: string) => apiClient.get<ActivityLogResponse>(`/api/v1/admin/activity-log/${id}`),

  /** Company-scoped counterpart of listRecent — gated by the audit_log.view permission rather than a platform role. */
  listMyCompany: (limit?: number) => apiClient.get<ActivityLogResponse[]>('/api/v1/activity-log', limit ? { limit } : undefined),

  getMyCompanyById: (id: string) => apiClient.get<ActivityLogResponse>(`/api/v1/activity-log/${id}`),
};
