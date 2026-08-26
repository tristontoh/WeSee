/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
