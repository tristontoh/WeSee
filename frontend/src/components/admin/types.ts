/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlanType } from '../../contexts/PlanContext';
import { TenantSummaryResponse } from '../../api/tenantAdminApi';
import { ActivityLogResponse, BackendActivityEventType } from '../../api/activityLogApi';
import { planFromBackend, marketFromBackend } from '../../api/mappers';
import { MatterCategory, MatterSet } from '../../api/referenceApi';

export interface Tenant {
  id: string;
  name: string;
  plan: PlanType;
  marketClassification: 'SME' | 'Main Market' | 'ACE Market';
  status: 'Active' | 'Suspended';
  createdDate: string;
  contactPerson: string;
  contactEmail: string;
  trialEndsAt: string | null;
  trialConverted: boolean;
}

export function toTenant(t: TenantSummaryResponse): Tenant {
  return {
    id: t.id,
    name: t.name,
    plan: planFromBackend(t.subscriptionPlan),
    marketClassification: marketFromBackend(t.marketClassification),
    status: t.active ? 'Active' : 'Suspended',
    createdDate: t.createdAt.slice(0, 10),
    contactPerson: t.primaryContactName ?? '—',
    contactEmail: t.primaryContactEmail ?? '—',
    trialEndsAt: t.trialEndsAt,
    trialConverted: t.trialConverted,
  };
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  companyId: string | null;
  tenantName: string;
  eventType: 'Signup' | 'Plan Change' | 'Sync Success' | 'Support Request' | 'Trial Converted' | 'Trial Revoked';
  eventDescription: string;
  badgeColor: string;
}

const ACTIVITY_EVENT_DISPLAY: Record<BackendActivityEventType, { label: ActivityLog['eventType']; badgeColor: string }> = {
  SIGNUP: { label: 'Signup', badgeColor: 'bg-blue-50 text-blue-700 border-blue-100' },
  PLAN_CHANGE: { label: 'Plan Change', badgeColor: 'bg-purple-50 text-purple-700 border-purple-100' },
  SUPPORT_TICKET: { label: 'Support Request', badgeColor: 'bg-amber-50 text-amber-700 border-amber-100' },
  EXPORT_SUCCESS: { label: 'Sync Success', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  TRIAL_CONVERTED: { label: 'Trial Converted', badgeColor: 'bg-teal-50 text-teal-700 border-teal-100' },
  TRIAL_REVOKED: { label: 'Trial Revoked', badgeColor: 'bg-red-50 text-red-700 border-red-100' },
};

export function toActivityLog(r: ActivityLogResponse): ActivityLog {
  // Falls back rather than throwing for a backend event type this map hasn't been updated for yet
  // (see ActivityEventType.java) — a whole page crashing over one unrecognized row is worse than
  // showing it with a generic badge.
  const display = ACTIVITY_EVENT_DISPLAY[r.eventType] ?? { label: r.eventType as ActivityLog['eventType'], badgeColor: 'bg-gray-50 text-gray-700 border-gray-100' };
  return {
    id: r.id,
    timestamp: new Date(r.timestamp).toLocaleString(),
    companyId: r.companyId,
    tenantName: r.companyName,
    eventType: display.label,
    eventDescription: r.description,
    badgeColor: display.badgeColor,
  };
}

export interface MatterFormState {
  id: string;
  name: string;
  category: MatterCategory;
  description: string;
  matterSet: MatterSet;
}

// Re-exported so every admin tab keeps importing from './types' — the app's single toast
// implementation now lives in contexts/ToastContext.tsx.
export type { ToastType, ShowToast } from '../../contexts/ToastContext';

