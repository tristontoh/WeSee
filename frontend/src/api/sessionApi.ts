/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export interface SessionResponse {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export const sessionApi = {
  list: () => apiClient.get<SessionResponse[]>('/api/v1/users/me/sessions'),

  revoke: (id: string) => apiClient.delete<void>(`/api/v1/users/me/sessions/${id}`),

  revokeOthers: () => apiClient.post<void>('/api/v1/users/me/sessions/revoke-others'),
};
