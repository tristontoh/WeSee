/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
