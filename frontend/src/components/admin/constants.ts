/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlanType } from '../../contexts/PlanContext';
import { BackendRole } from '../../api/tenantAdminApi';
import { BackendSubscriptionPlan } from '../../api/mappers';
import { MatterCategory, MatterSet } from '../../api/referenceApi';

export const PLAN_ORDER: BackendSubscriptionPlan[] = ['STARTER', 'GROWTH', 'ISSUER_READY'];
export const PLAN_LABELS: Record<BackendSubscriptionPlan, string> = { STARTER: 'Starter', GROWTH: 'Growth', ISSUER_READY: 'Issuer-Ready' };
export const PLAN_BADGE_CLASSES: Record<BackendSubscriptionPlan, string> = {
  STARTER: 'bg-gray-100 text-gray-600',
  GROWTH: 'bg-indigo-50 text-indigo-700',
  ISSUER_READY: 'bg-purple-50 text-purple-700',
};

// Display copy for feature keys — the backend's feature_flag table only stores the gating rule
// (min plan, visibility), not display copy, so labels live here (mirrors PlanContext.tsx's own
// FEATURE_REGISTRY, which is what tenants see; this is the admin-facing counterpart).
export const FEATURE_LABELS: Record<string, { name: string; description: string }> = {
  'dashboard': { name: 'Dashboard', description: 'Real-time overview of sustainability reporting progress.' },
  'materiality': { name: 'Materiality Assessment', description: 'Identify and prioritize ESG issues.' },
  'indicators': { name: 'Indicators', description: 'Track key sustainability metrics and disclosures.' },
  'reports': { name: 'Reports & Export', description: 'Export standardized ESG summaries and reports.' },
  'team': { name: 'Team Management', description: 'Invite and manage workspace team members.' },
  'billing': { name: 'Billing & Plan', description: 'Manage subscription and billing preferences.' },
  'settings': { name: 'Platform Settings', description: 'Configure workspace details and reporting cycles.' },
  'governance': { name: 'Governance', description: 'Board oversight, policies, and risk management workflows.' },
  'targets': { name: 'Targets', description: 'Set and monitor custom ESG targets and science-based goals.' },
  'ifrs-s1-s2': { name: 'IFRS S1/S2', description: 'Climate-related risk reporting aligned to global IFRS standards.' },
  'climate-module': { name: 'Climate Module', description: 'Scope 1, 2 & 3 GHG calculations and analytics.' },
  'assurance-workspace': { name: 'Assurance Workspace', description: 'Audit-ready trails for external assurance providers.' },
  'csi-export': { name: 'CSI Export', description: 'Direct integration and export to Bursa Malaysia\'s CSI portal.' },
};

// Client-computed monthly price per plan tier — there's no billing/invoice table backing this,
// so it's derived rather than stored (see backend/.../tenant/TenantAdminController.java).
export const PLAN_PRICING: Record<PlanType, number> = { starter: 299, growth: 699, 'issuer-ready': 1499 };

export type AdminTab = 'overview' | 'tenants' | 'reference' | 'billing' | 'support' | 'plans' | 'audit-log' | 'settings';
export const ADMIN_TABS: AdminTab[] = ['overview', 'tenants', 'reference', 'billing', 'support', 'plans', 'audit-log', 'settings'];

export const ROLE_LABELS: Record<BackendRole, string> = {
  COMPANY_ADMIN: 'Company Admin',
  COMPANY_CONTRIBUTOR: 'Contributor',
  CONSULTANT: 'Consultant',
  PLATFORM_ADMIN: 'Platform Admin',
  SUPERADMIN: 'Super Admin',
};

export const MATTER_SET_LABELS: Record<MatterSet, string> = {
  SEDG: 'SEDG (SME)',
  BURSA_MAIN: 'Bursa Main Market (11-matter)',
  BURSA_ACE: 'Bursa ACE Market (9-matter)',
  SECTOR: 'Sector Add-on',
};

export const MATTER_CATEGORY_LABELS: Record<MatterCategory, string> = {
  ENVIRONMENTAL: 'Environmental',
  SOCIAL: 'Social',
  GOVERNANCE: 'Governance',
};
