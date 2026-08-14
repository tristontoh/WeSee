export type TenantKey = 'workspace' | 'compliance-hub' | 'admin';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  d: string;
  /** Hidden unless the session role is COMPANY_ADMIN. */
  adminOnly?: boolean;
  /** Backend feature key. Hidden when PlanGateService reports 'hidden' for it. */
  feature?: string;
}

/**
 * The Emissions Dashboard belongs to both nav sets. Its data is guarded by `climate-module`
 * (ISSUER_READY, visibleOnlyAtMinPlan), and M1's plan-derived navigation gives ISSUER_READY
 * companies the compliance-hub nav — so listing it only under workspace would show it to
 * exactly the tiers that get a 403 and hide it from the one tier that can use it.
 */
const DASHBOARD: NavItem = {
  key: 'dashboard',
  label: 'Emissions Dashboard',
  path: '/dashboard',
  d: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  feature: 'climate-module',
};

const MATERIALITY: NavItem = {
  key: 'materiality',
  label: 'Materiality',
  path: '/materiality',
  d: 'M3 3v18h18M7 16l4-6 4 3 5-8',
};

const GOVERNANCE: NavItem = {
  key: 'governance',
  label: 'Governance',
  path: '/governance',
  d: 'M3 21h18M4 21V10M20 21V10M12 3L2 9h20zM8 21V10M16 21V10',
  feature: 'governance',
};

const TARGETS: NavItem = {
  key: 'targets',
  label: 'Targets',
  path: '/targets',
  d: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M12 12m-5 0a5 5 0 1010 0 5 5 0 10-10 0M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0',
  feature: 'targets',
};

const ASSURANCE: NavItem = {
  key: 'assurance',
  label: 'Assurance',
  path: '/assurance',
  d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  feature: 'assurance-workspace',
};

const IFRS: NavItem = {
  key: 'ifrs',
  label: 'IFRS Disclosures',
  path: '/ifrs',
  d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6',
  feature: 'ifrs-s1-s2',
};

const ACCOUNT: NavItem = {
  key: 'account',
  label: 'Account',
  path: '/account',
  d: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8',
};

const TEAM: NavItem = {
  key: 'team',
  label: 'Team',
  path: '/team',
  d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
};

const INDICATORS: NavItem = {
  key: 'indicators',
  label: 'Indicators',
  path: '/indicators',
  d: 'M3 3v18h18M7 15l4-4 3 3 5-6',
};

const ACTIVITY: NavItem = {
  key: 'activity',
  label: 'Emission Activity',
  path: '/activity',
  d: 'M13 2L3 14h8l-1 8 10-12h-8z',
};

const GROUP: NavItem = {
  key: 'group',
  label: 'Group',
  path: '/group',
  d: 'M3 3h7v7H3zM14 14h7v7h-7zM7 10v4h10',
  adminOnly: true,
};

export const NAV: Record<TenantKey, NavItem[]> = {
  workspace: [
    { key: 'onboarding', label: 'Onboarding', path: '/onboarding', d: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M19 8v6M22 11h-6' },
    INDICATORS,
    ACTIVITY,
    MATERIALITY,
    GOVERNANCE,
    TARGETS,
    DASHBOARD,
    IFRS,
    ASSURANCE,
    { key: 'export', label: 'Export Center', path: '/export', d: 'M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13' },
    TEAM,
    GROUP,
    ACCOUNT,
  ],
  'compliance-hub': [
    INDICATORS,
    ACTIVITY,
    MATERIALITY,
    GOVERNANCE,
    TARGETS,
    DASHBOARD,
    IFRS,
    ASSURANCE,
    TEAM,
    GROUP,
    ACCOUNT,
  ],
  admin: [
    { key: 'tenants', label: 'Tenants', path: '/admin/tenants', d: 'M3 21h18M6 21V7l6-4 6 4v14M10 9h.01M14 9h.01M10 13h.01M14 13h.01' },
    { key: 'support', label: 'Support Tools', path: '/admin/support', d: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z' },
    { key: 'platform', label: 'Platform', path: '/admin/platform', d: 'M4 4h16v12H4zM2 20h20M9 8h6M9 12h6' },
    ACCOUNT,
  ],
};

/**
 * Where each nav lands after login. Workspace-tier companies go to /indicators, not
 * /dashboard: the dashboard reads climate-module data, which is ISSUER_READY-only, so sending
 * them there would end every signup at a 403.
 */
export const DEFAULT_ROUTE: Record<TenantKey, string> = {
  workspace: '/indicators',
  'compliance-hub': '/indicators',
  admin: '/admin/tenants',
};

export const SCREEN_TITLES: Record<string, string> = { settings: 'Settings' };
Object.values(NAV).flat().forEach((n) => (SCREEN_TITLES[n.path] = n.label));
