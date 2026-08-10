export type TenantKey = 'workspace' | 'compliance-hub' | 'admin';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  d: string;
  /** Hidden unless the session role is COMPANY_ADMIN. */
  adminOnly?: boolean;
}

const TEAM: NavItem = {
  key: 'team',
  label: 'Team',
  path: '/team',
  d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
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
    { key: 'upload', label: 'Upload Center', path: '/upload', d: 'M12 16V4M7 9l5-5 5 5M4 20h16' },
    { key: 'review', label: 'Extraction Review', path: '/review', d: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9' },
    { key: 'dashboard', label: 'Emissions Dashboard', path: '/dashboard', d: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
    { key: 'trust', label: 'Trust Score', path: '/trust', d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z' },
    { key: 'export', label: 'Export Center', path: '/export', d: 'M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13' },
    TEAM,
    GROUP,
  ],
  'compliance-hub': [
    { key: 'overview', label: 'Carbon Overview', path: '/compliance-hub/overview', d: 'M12 3v9l7.5 4.3M12 3a9 9 0 109 9' },
    { key: 'ledger', label: 'Assurance Ledger', path: '/compliance-hub/ledger', d: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
    { key: 'arbitrage', label: 'Sourcing Arbitrage', path: '/compliance-hub/arbitrage', d: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6' },
    { key: 'report', label: 'Report Builder', path: '/compliance-hub/report', d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6' },
    { key: 'compliance', label: 'Compliance Exports', path: '/compliance-hub/compliance', d: 'M9 12l2 2 4-4M12 3l7 4v5c0 4-3 7-7 8-4-1-7-4-7-8V7z' },
    TEAM,
    GROUP,
  ],
  admin: [
    { key: 'tenants', label: 'Tenants', path: '/admin/tenants', d: 'M3 21h18M6 21V7l6-4 6 4v14M10 9h.01M14 9h.01M10 13h.01M14 13h.01' },
    { key: 'mapping', label: 'Framework Mapping', path: '/admin/mapping', d: 'M12 3v18M3 9h18M3 3h18v18H3z' },
    { key: 'tokens', label: 'Token Monitor', path: '/admin/tokens', d: 'M21 2l-2 2m-7.6 7.6a5 5 0 11-7 7 5 5 0 017-7zM15 7l4 4' },
    { key: 'audit', label: 'Audit Log', path: '/admin/audit', d: 'M4 4h13l3 3v13H4zM8 9h8M8 13h8M8 17h5' },
    { key: 'support', label: 'Support Tools', path: '/admin/support', d: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z' },
  ],
};

export const DEFAULT_ROUTE: Record<TenantKey, string> = {
  workspace: '/dashboard',
  'compliance-hub': '/compliance-hub/overview',
  admin: '/admin/tenants',
};

export const SCREEN_TITLES: Record<string, string> = { settings: 'Settings' };
Object.values(NAV).flat().forEach((n) => (SCREEN_TITLES[n.path] = n.label));
