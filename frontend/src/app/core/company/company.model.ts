import { Role, SubscriptionPlan } from '../auth/session.model';

export type MarketClassification = 'SME' | 'MAIN_MARKET' | 'ACE_MARKET';
export type CompanySizeBand = 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE';

/** Roles a company admin may assign. Platform roles are deliberately excluded. */
export const ASSIGNABLE_ROLES: Role[] = ['COMPANY_ADMIN', 'COMPANY_CONTRIBUTOR', 'CONSULTANT'];

export const MARKETS: { value: MarketClassification; label: string }[] = [
  { value: 'SME', label: 'SME' },
  { value: 'MAIN_MARKET', label: 'Main Market' },
  { value: 'ACE_MARKET', label: 'ACE Market' },
];

export const SIZE_BANDS: { value: CompanySizeBand; label: string }[] = [
  { value: 'MICRO', label: 'Micro' },
  { value: 'SMALL', label: 'Small' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LARGE', label: 'Large' },
];

export interface CompanyResponse {
  id: string;
  name: string;
  sectorCode: string | null;
  sizeBand: CompanySizeBand | null;
  marketClassification: MarketClassification | null;
  subscriptionPlan: SubscriptionPlan;
  sectorModuleEnabled: boolean;
  onboardingCompleted: boolean;
}

export interface TenantUserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

/** Carries a one-time secret: with SMTP off this is the only way the user gets in. */
export interface CreateTenantUserResponse extends TenantUserResponse {
  temporaryPassword: string;
}

/** Also carries a one-time secret — inviteUrl. */
export interface TeamInviteResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  inviteUrl: string;
}

export interface CompanyGroupMemberResponse {
  id: string;
  name: string;
  sectorCode: string | null;
  marketClassification: MarketClassification | null;
  subscriptionPlan: SubscriptionPlan;
  current: boolean;
}

export interface UpdateCompanyProfileRequest {
  sectorCode?: string;
  sizeBand?: CompanySizeBand;
  sectorModuleEnabled?: boolean;
}
