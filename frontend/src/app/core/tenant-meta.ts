import { TenantKey } from './nav';

export interface TenantMeta {
  label: string;
  sub: string;
  plan: { name: string; detail: string; mark: string; badgeBg: string; badgeFg: string; pill: string; pillBg: string; pillFg: string };
  user: { name: string; initials: string; email: string };
}

export const TENANT_META: Record<TenantKey, TenantMeta> = {
  workspace: {
    label: 'Workspace',
    sub: 'Rimba Electronics Sdn Bhd',
    plan: { name: 'Workspace Starter', detail: 'RM19 / month', mark: 'S', badgeBg: '#4D7E86', badgeFg: '#fff', pill: 'Starter', pillBg: '#E4EEF0', pillFg: '#4C96B3' },
    user: { name: 'Aisyah R.', initials: 'AR', email: 'aisyah.r@rimba.com' },
  },
  'compliance-hub': {
    label: 'Compliance Hub',
    sub: 'Sunway Group Bhd',
    plan: { name: 'Compliance Hub Enterprise', detail: 'Unlimited suppliers', mark: 'P', badgeBg: '#D96BA1', badgeFg: '#fff', pill: 'Enterprise', pillBg: '#F9E6EF', pillFg: '#D96BA1' },
    user: { name: 'Daniel T.', initials: 'DT', email: 'daniel.t@sunway.com' },
  },
  admin: {
    label: 'Admin Portal',
    sub: 'WeSee internal · superuser',
    plan: { name: 'Platform Admin', detail: 'Full access', mark: 'A', badgeBg: '#CBDCDF', badgeFg: '#fff', pill: 'Admin', pillBg: '#E7F0F2', pillFg: '#CBDCDF' },
    user: { name: 'Sys Admin', initials: 'SA', email: 'sys.admin@wesee.io' },
  },
};

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
