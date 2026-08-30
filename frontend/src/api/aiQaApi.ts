/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export interface AskRequest {
  question: string;
  context?: Record<string, string>;
}

export interface AskResponse {
  answer: string;
  grounded: boolean;
}

export const aiQaApi = {
  ask: (request: AskRequest) => apiClient.post<AskResponse>('/api/v1/company/ai/ask', request),
};
