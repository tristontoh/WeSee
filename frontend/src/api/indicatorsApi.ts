/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';
import { MatterCategory, TargetDirection } from './referenceApi';

export type IndicatorValueStatus = 'DRAFT' | 'APPROVED';

export type AggregationRule = 'SUM' | 'LATEST' | 'AVERAGE' | 'COUNT' | 'DIRECT_ANNUAL';

export interface IndicatorValuePoint {
  fiscalYear: number;
  value: number | null;
  status: IndicatorValueStatus;
  approvedByName: string | null;
  approvedAt: string | null;
  isComputed: boolean;
  monthsReported: number;
}

export interface IndicatorAuditEntryDto {
  id: string;
  fiscalYear: number;
  month: number | null;
  value: number;
  enteredBy: string;
  enteredAt: string;
  sourceDocName: string | null;
  sourceDocPath: string | null;
  comment: string | null;
}

export interface IndicatorMonthlyValueDto {
  fiscalYear: number;
  month: number;
  value: number | null;
  enteredBy: string | null;
  enteredAt: string | null;
  sourceDocName: string | null;
  sourceDocPath: string | null;
}

export interface IndicatorResponse {
  id: string;
  name: string;
  unit: string;
  matterId: string;
  category: MatterCategory;
  sectorSpecific: boolean;
  sectorCode: string | null;
  effectiveTarget: number | null;
  effectiveTargetDirection: TargetDirection | null;
  enabled: boolean;
  aggregationRule: AggregationRule;
  values: IndicatorValuePoint[];
  monthlyValues: IndicatorMonthlyValueDto[];
  history: IndicatorAuditEntryDto[];
}

export const indicatorsApi = {
  list: () => apiClient.get<IndicatorResponse[]>('/api/v1/indicators'),

  get: (indicatorId: string) => apiClient.get<IndicatorResponse>(`/api/v1/indicators/${indicatorId}`),

  setValue: (indicatorId: string, fiscalYear: number, value: number, sourceDocName?: string, comment?: string) =>
    apiClient.patch<IndicatorResponse>(`/api/v1/indicators/${indicatorId}/values/${fiscalYear}`, {
      value,
      sourceDocName,
      comment,
    }),

  setMonthlyValue: (indicatorId: string, fiscalYear: number, month: number, value: number, sourceDocName?: string, comment?: string) =>
    apiClient.patch<IndicatorResponse>(`/api/v1/indicators/${indicatorId}/monthly/${fiscalYear}/${month}`, {
      value,
      sourceDocName,
      comment,
    }),

  setTarget: (indicatorId: string, target: number, targetDirection: TargetDirection) =>
    apiClient.patch<IndicatorResponse>(`/api/v1/indicators/${indicatorId}/target`, { target, targetDirection }),

  approveValue: (indicatorId: string, fiscalYear: number) =>
    apiClient.patch<IndicatorResponse>(`/api/v1/indicators/${indicatorId}/values/${fiscalYear}/approve`),

  uploadEvidence: (auditEntryId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postFile<IndicatorAuditEntryDto>(`/api/v1/indicators/audit-entries/${auditEntryId}/evidence`, formData);
  },

  downloadEvidence: (auditEntryId: string) =>
    apiClient.getBlob(`/api/v1/indicators/audit-entries/${auditEntryId}/evidence`),
};
