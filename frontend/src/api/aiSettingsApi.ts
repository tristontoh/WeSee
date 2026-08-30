/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export type AiProvider = 'ANTHROPIC' | 'OPENAI' | 'GEMINI';

export interface AiProviderConfigResponse {
  configured: boolean;
  provider: AiProvider | null;
  model: string | null;
  enabled: boolean;
  apiKeySet: boolean;
}

export interface UpdateAiProviderConfigRequest {
  provider: AiProvider;
  model: string;
  /** Blank keeps the existing stored key. Required the first time, and whenever the provider changes. */
  apiKey: string;
  enabled: boolean;
}

export interface TestAiConnectionResponse {
  success: boolean;
  message: string;
}

export const aiSettingsApi = {
  get: () => apiClient.get<AiProviderConfigResponse>('/api/v1/company/ai/settings'),

  update: (data: UpdateAiProviderConfigRequest) =>
    apiClient.put<AiProviderConfigResponse>('/api/v1/company/ai/settings', data),

  test: () => apiClient.post<TestAiConnectionResponse>('/api/v1/company/ai/settings/test'),
};
