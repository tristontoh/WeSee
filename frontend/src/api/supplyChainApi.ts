/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root - visibility is not a licence to use.
 */

import { apiClient } from './client';

export type SupplyLinkStatus = 'PENDING' | 'ACTIVE' | 'DECLINED' | 'REVOKED';

export interface SupplyLinkDto {
  id: string;
  /** The other company. Which one that is depends on the role you are reading the link in. */
  counterpartyName: string | null;
  counterpartyEmail: string | null;
  status: SupplyLinkStatus;
  invitedAt: string;
  respondedAt: string | null;
  actingAsBuyer: boolean;
}

export interface SharedDisclosureLineDto {
  scope: string;
  emissionFactorId: string;
  emissionFactorName: string;
  quantity: number;
  activityUnit: string;
  /** Copied at publish time, so it keeps reporting what was signed. */
  factorValue: number;
  factorSource: string;
  factorSourceYear: number | null;
  tco2e: number;
}

export interface SharedDisclosureDto {
  id: string;
  supplyLinkId: string;
  counterpartyName: string | null;
  fiscalYear: number;
  scope1Tco2e: number;
  scope2Tco2e: number;
  totalTco2e: number;
  basisQuantity: number;
  basisUnit: string;
  signOffHash: string;
  signerName: string;
  signedAt: string;
  publishedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
  supersededByNewer: boolean;
  lines: SharedDisclosureLineDto[];
}

export interface Scope3AllocationDto {
  id: string;
  sharedDisclosureId: string;
  supplierName: string | null;
  fiscalYear: number;
  purchasedQuantity: number;
  purchasedUnit: string;
  basisQuantity: number | null;
  shareFraction: number;
  supplierTotalTco2e: number | null;
  allocatedTco2e: number;
  ghgCategory: number;
  newerSnapshotAvailable: boolean;
  sourceWithdrawn: boolean;
}

const base = '/api/v1/supply-chain';

export const supplyChainApi = {
  listAsBuyer: () => apiClient.get<SupplyLinkDto[]>(`${base}/links/as-buyer`),
  listAsSupplier: () => apiClient.get<SupplyLinkDto[]>(`${base}/links/as-supplier`),

  invite: (supplierEmail: string, supplierName?: string) =>
    apiClient.post<SupplyLinkDto>(`${base}/links/invite`, { supplierEmail, supplierName }),

  accept: (token: string) => apiClient.post<SupplyLinkDto>(`${base}/links/accept/${token}`),
  decline: (token: string) => apiClient.post<void>(`${base}/links/decline/${token}`),
  revokeLink: (linkId: string) => apiClient.delete<void>(`${base}/links/${linkId}`),

  listMinePublished: () => apiClient.get<SharedDisclosureDto[]>(`${base}/disclosures/mine`),
  listAvailable: () => apiClient.get<SharedDisclosureDto[]>(`${base}/disclosures/available`),

  publish: (linkId: string, fiscalYear: number, basisQuantity?: number, basisUnit?: string) =>
    apiClient.post<SharedDisclosureDto>(`${base}/links/${linkId}/publish`, {
      fiscalYear,
      basisQuantity,
      basisUnit,
    }),

  // The reason is a query param on the server. Passing it as apiClient.delete's second argument
  // made it a request body, which the controller never reads — the supplier was asked why and
  // the answer was discarded.
  revokeDisclosure: (disclosureId: string, reason?: string) =>
    apiClient.delete<void>(
      `${base}/disclosures/${disclosureId}` + (reason ? `?reason=${encodeURIComponent(reason)}` : ''),
    ),

  listAllocations: () => apiClient.get<Scope3AllocationDto[]>(`${base}/allocations`),

  allocate: (disclosureId: string, purchasedQuantity: number) =>
    apiClient.post<Scope3AllocationDto>(`${base}/disclosures/${disclosureId}/allocate`, {
      purchasedQuantity,
    }),

  removeAllocation: (allocationId: string) =>
    apiClient.delete<void>(`${base}/allocations/${allocationId}`),
};
