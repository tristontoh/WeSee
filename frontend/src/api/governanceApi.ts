/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';

export type OversightLevel = 'OVERSIGHT' | 'STRATEGIC' | 'IMPLEMENTATION';

export interface GovernanceLevelResponse {
  level: OversightLevel;
  roleTitle: string;
  description: string | null;
}

export interface MatterOwnershipResponse {
  matterId: string;
  matterName: string;
  ownerName: string;
  oversightLevel: OversightLevel;
  notes: string | null;
}

export const governanceApi = {
  getStructure: () => apiClient.get<GovernanceLevelResponse[]>('/api/v1/governance/structure'),

  updateLevel: (level: OversightLevel, roleTitle: string, description: string) =>
    apiClient.put<GovernanceLevelResponse>(`/api/v1/governance/structure/${level}`, { roleTitle, description }),

  getOwnership: () => apiClient.get<MatterOwnershipResponse[]>('/api/v1/governance/ownership'),

  updateOwnership: (matterId: string, ownerName: string, oversightLevel: OversightLevel, notes: string) =>
    apiClient.put<MatterOwnershipResponse>(`/api/v1/governance/ownership/${matterId}`, { ownerName, oversightLevel, notes }),

  downloadReport: () => apiClient.getBlob('/api/v1/governance/report.pdf'),
};
