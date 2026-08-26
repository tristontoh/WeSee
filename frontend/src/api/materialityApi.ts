/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';
import { MatterCategory } from './referenceApi';
import { BackendMarketClassification, BackendSubscriptionPlan } from './mappers';

export interface StakeholderOptionResponse {
  id: string;
  name: string;
  selected: boolean;
  custom: boolean;
}

export type AssessmentStatus = 'DRAFT' | 'VALIDATED';

export interface ScoreInput {
  matterId: string;
  impact: number;
  influence: number;
  rationale?: string;
}

export interface ScoreResponse {
  matterId: string;
  matterName: string;
  category: MatterCategory;
  impact: number;
  influence: number;
  rationale: string | null;
  priorityTier: string;
}

export interface AssessmentSummaryResponse {
  id: string;
  name: string;
  assessmentDate: string;
  planAtCapture: BackendSubscriptionPlan;
  marketAtCapture: BackendMarketClassification | null;
  createdByName: string | null;
  status: AssessmentStatus;
  validatedByName: string | null;
  validatedAt: string | null;
}

export interface AssessmentDetailResponse extends AssessmentSummaryResponse {
  stakeholders: string[];
  scores: ScoreResponse[];
}

export const materialityApi = {
  stakeholderOptions: () => apiClient.get<StakeholderOptionResponse[]>('/api/v1/materiality/stakeholder-options'),

  addStakeholder: (name: string) =>
    apiClient.post<StakeholderOptionResponse>('/api/v1/materiality/stakeholder-options', { name }),

  toggleStakeholder: (id: string, selected: boolean) =>
    apiClient.patch<StakeholderOptionResponse>(`/api/v1/materiality/stakeholder-options/${id}`, { selected }),

  deleteStakeholder: (id: string) => apiClient.delete<void>(`/api/v1/materiality/stakeholder-options/${id}`),

  listAssessments: () => apiClient.get<AssessmentSummaryResponse[]>('/api/v1/materiality/assessments'),

  getAssessment: (id: string) => apiClient.get<AssessmentDetailResponse>(`/api/v1/materiality/assessments/${id}`),

  createAssessment: (data: { name: string; assessmentDate: string; scores: ScoreInput[]; stakeholderNames?: string[] }) =>
    apiClient.post<AssessmentDetailResponse>('/api/v1/materiality/assessments', data),

  validateAssessment: (id: string) =>
    apiClient.patch<AssessmentDetailResponse>(`/api/v1/materiality/assessments/${id}/validate`),

  downloadReport: (id: string) => apiClient.getBlob(`/api/v1/materiality/assessments/${id}/report.pdf`),
};
