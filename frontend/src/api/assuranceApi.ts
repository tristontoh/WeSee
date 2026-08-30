/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export type SignOffStatus = 'SIGNED' | 'REVOKED';
export type AssuranceLevel = 'INTERNAL_REVIEW' | 'EXTERNAL_LIMITED' | 'EXTERNAL_REASONABLE';

export interface SignOffResponse {
  fiscalYear: number;
  status: SignOffStatus;
  signerName: string | null;
  signerTitle: string | null;
  notes: string | null;
  hash: string | null;
  signedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string | null;
  assuranceLevel: AssuranceLevel;
  externalAssurerName: string | null;
  standardReferenced: string | null;
  nextExternalAssuranceDeadline: string | null;
}

export interface SignOffAuditEntryResponse {
  action: SignOffStatus;
  actorName: string;
  actorTitle: string | null;
  notes: string | null;
  hash: string | null;
  timestamp: string;
}

export const assuranceApi = {
  list: () => apiClient.get<SignOffResponse[]>('/api/v1/assurance/signoff'),

  get: (fiscalYear: number) => apiClient.get<SignOffResponse>(`/api/v1/assurance/signoff/${fiscalYear}`),

  completion: (fiscalYear: number) =>
    apiClient.get<{ completionPercent: number }>(`/api/v1/assurance/signoff/${fiscalYear}/completion`),

  signOff: (
    fiscalYear: number,
    signerName: string,
    signerTitle: string,
    notes?: string,
    assuranceLevel?: AssuranceLevel,
    externalAssurerName?: string,
    standardReferenced?: string
  ) =>
    apiClient.post<SignOffResponse>(`/api/v1/assurance/signoff/${fiscalYear}`, {
      signerName, signerTitle, notes, assuranceLevel, externalAssurerName, standardReferenced
    }),

  revoke: (fiscalYear: number, reason?: string) =>
    apiClient.delete<SignOffResponse>(`/api/v1/assurance/signoff/${fiscalYear}`, { reason }),

  auditTrail: (fiscalYear: number) =>
    apiClient.get<SignOffAuditEntryResponse[]>(`/api/v1/assurance/signoff/${fiscalYear}/audit-trail`),
};
