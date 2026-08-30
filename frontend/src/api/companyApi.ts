/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';
import { BackendMarketClassification, BackendSubscriptionPlan } from './mappers';
import { TenantUserResponse, BackendRole } from './tenantAdminApi';

export type ListingBoard = 'MAIN_MARKET' | 'ACE_MARKET' | 'LEAP_MARKET' | 'PRIVATE' | 'OTHER';
export type CompanyType = 'PUBLIC_LISTED' | 'PRIVATE_LIMITED' | 'SUBSIDIARY' | 'PARTNERSHIP' | 'SOLE_PROPRIETORSHIP' | 'OTHER';

export interface CreateTenantUserResponse extends TenantUserResponse {
  temporaryPassword: string;
}

export interface TeamInviteResponse {
  id: string;
  name: string;
  email: string;
  role: BackendRole;
  customRoleId: string | null;
  customRoleName: string | null;
  invitedByName: string | null;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  inviteUrl: string;
}

export interface CompanyResponse {
  id: string;
  name: string;
  sectorCode: string | null;
  sizeBand: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | null;
  marketClassification: BackendMarketClassification;
  subscriptionPlan: BackendSubscriptionPlan;
  sectorModuleEnabled: boolean;
  onboardingCompleted: boolean;
}

/** The editable half of {@link CompanyGroupMember} — identity, not plan or market. */
export interface UpdateCompanyIdentityRequest {
  name: string;
  registrationNumber: string | null;
  tickerCode: string | null;
  dateOfIncorporation: string | null;
  countryOfIncorporation: string | null;
  listingBoard: ListingBoard | null;
  companyType: CompanyType | null;
  registeredOfficeAddress: string | null;
  businessAddress: string | null;
  contactPersonName: string | null;
  contactPersonDesignation: string | null;
  contactPersonEmail: string | null;
  contactPersonPhone: string | null;
  taxIdentificationNumber: string | null;
}

export interface CompanyGroupMember {
  id: string;
  name: string;
  sectorCode: string | null;
  marketClassification: BackendMarketClassification;
  subscriptionPlan: BackendSubscriptionPlan;
  current: boolean;

  registrationNumber: string | null;
  tickerCode: string | null;
  dateOfIncorporation: string | null;
  countryOfIncorporation: string | null;

  listingBoard: ListingBoard | null;
  companyType: CompanyType | null;

  registeredOfficeAddress: string | null;
  businessAddress: string | null;
  contactPersonName: string | null;
  contactPersonDesignation: string | null;
  contactPersonEmail: string | null;
  contactPersonPhone: string | null;
  taxIdentificationNumber: string | null;
}

export interface CreateSubsidiaryRequest {
  name: string;
  sectorCode?: string;

  registrationNumber?: string;
  tickerCode?: string;
  dateOfIncorporation?: string;
  countryOfIncorporation?: string;

  listingBoard?: ListingBoard;
  companyType?: CompanyType;

  registeredOfficeAddress?: string;
  businessAddress?: string;
  contactPersonName?: string;
  contactPersonDesignation?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  taxIdentificationNumber?: string;
}

export const companyApi = {
  get: () => apiClient.get<CompanyResponse>('/api/v1/company'),

  updatePlan: (plan: BackendSubscriptionPlan) =>
    apiClient.patch<CompanyResponse>('/api/v1/company/plan', { plan }),

  updateProfile: (data: { sectorCode?: string; sizeBand?: string; sectorModuleEnabled?: boolean }) =>
    apiClient.patch<CompanyResponse>('/api/v1/company/profile', data),

  listUsers: () => apiClient.get<TenantUserResponse[]>('/api/v1/company/users'),

  createUser: (name: string, email: string, role: BackendRole, customRoleId?: string | null) =>
    apiClient.post<CreateTenantUserResponse>('/api/v1/company/users', { name, email, role, customRoleId }),

  updateUserRole: (userId: string, role: BackendRole, customRoleId?: string | null) =>
    apiClient.patch<TenantUserResponse>(`/api/v1/company/users/${userId}/role`, { role, customRoleId }),

  setUserActive: (userId: string, active: boolean) =>
    apiClient.patch<TenantUserResponse>(`/api/v1/company/users/${userId}/active?active=${active}`),

  listInvites: () => apiClient.get<TeamInviteResponse[]>('/api/v1/company/invites'),

  createInvite: (name: string, email: string, role: BackendRole, customRoleId?: string | null) =>
    apiClient.post<TeamInviteResponse>('/api/v1/company/invites', { name, email, role, customRoleId }),

  resendInvite: (inviteId: string) =>
    apiClient.post<TeamInviteResponse>(`/api/v1/company/invites/${inviteId}/resend`),

  revokeInvite: (inviteId: string) =>
    apiClient.delete<void>(`/api/v1/company/invites/${inviteId}`),

  getGroup: () => apiClient.get<CompanyGroupMember[]>('/api/v1/company/group'),

  createSubsidiary: (data: CreateSubsidiaryRequest) =>
    apiClient.post<CompanyGroupMember>('/api/v1/company/subsidiaries', data),

  switchCompany: (companyId: string) =>
    apiClient.post<CompanyGroupMember>(`/api/v1/company/switch/${companyId}`),

  deleteSubsidiary: (companyId: string) =>
    apiClient.delete<void>(`/api/v1/company/subsidiaries/${companyId}`),

  /**
   * Corporate identity of one company in the group, the root included. Every field is sent every
   * time — the backend treats a blank as "cleared", so a partial payload would silently wipe
   * whatever it left out. Requires `settings.manage`.
   */
  updateIdentity: (companyId: string, data: UpdateCompanyIdentityRequest) =>
    apiClient.patch<CompanyGroupMember>(`/api/v1/company/${companyId}/identity`, data),
};
