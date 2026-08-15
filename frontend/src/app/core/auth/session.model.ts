export type Role =
  | 'COMPANY_ADMIN'
  | 'COMPANY_CONTRIBUTOR'
  | 'CONSULTANT'
  | 'PLATFORM_ADMIN'
  | 'SUPERADMIN';

export type SubscriptionPlan = 'STARTER' | 'GROWTH' | 'ISSUER_READY';

/** Mirrors backend SubscriptionPlan levels so `atLeast` comparisons match the server. */
export const PLAN_LEVEL: Record<SubscriptionPlan, number> = {
  STARTER: 1,
  GROWTH: 2,
  ISSUER_READY: 3,
};

/** Mirrors com.wesee.esg.auth.dto.MeResponse. */
export interface MeResponse {
  userId: string;
  name: string;
  email: string;
  role: Role;
  companyId: string | null;
  companyName: string | null;
  sectorCode: string | null;
  market: string | null;
  plan: SubscriptionPlan | null;
  onboardingCompleted: boolean;
  frameworks: string[];
  priorities: string[];
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  bio: string | null;
  hasAvatar: boolean;
  mfaSetupRequired: boolean;
}

export interface AuthResponse {
  token: string;
  user: MeResponse;
}

export interface LoginResponse {
  mfaRequired: boolean;
  mfaToken: string | null;
  emailVerificationRequired: boolean;
  auth: AuthResponse | null;
}

/** Mirrors com.wesee.esg.auth.dto.InvitePreviewResponse. */
export interface InvitePreviewResponse {
  companyName: string;
  name: string;
  email: string;
  role: Role;
  invitedByName: string | null;
}

export type NavKey = 'workspace' | 'compliance-hub' | 'admin';
