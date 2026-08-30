/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export type ApiScope = 'INDICATORS_READ' | 'INDICATORS_WRITE';

export interface ApiTokenResponse {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: ApiScope[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
}

/** Identical to ApiTokenResponse plus the plaintext token — present only in the create response, never again. */
export interface CreateApiTokenResponse extends ApiTokenResponse {
  token: string;
}

export const apiTokenApi = {
  list: () => apiClient.get<ApiTokenResponse[]>('/api/v1/api-tokens'),

  create: (name: string, scopes: ApiScope[], expiresInDays?: number) =>
    apiClient.post<CreateApiTokenResponse>('/api/v1/api-tokens', { name, scopes, expiresInDays }),

  revoke: (id: string) => apiClient.delete<void>(`/api/v1/api-tokens/${id}`),
};
