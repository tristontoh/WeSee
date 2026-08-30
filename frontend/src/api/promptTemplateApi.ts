/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export interface PromptTemplateResponse {
  draftType: string;
  label: string;
  description: string | null;
  systemPrompt: string;
  userPromptTemplate: string;
  isCustomized: boolean;
}

export interface UpdatePromptTemplateRequest {
  systemPrompt: string;
  userPromptTemplate: string;
}

export const promptTemplateApi = {
  list: () => apiClient.get<PromptTemplateResponse[]>('/api/v1/company/ai/prompt-templates'),

  update: (draftType: string, data: UpdatePromptTemplateRequest) =>
    apiClient.put<PromptTemplateResponse>(`/api/v1/company/ai/prompt-templates/${draftType}`, data),

  resetToDefault: (draftType: string) =>
    apiClient.delete<PromptTemplateResponse>(`/api/v1/company/ai/prompt-templates/${draftType}/override`),
};
