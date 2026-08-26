/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComplianceStatus } from '../api/compliancePolicyApi';

export const COMPLIANCE_STATUS_STYLES: Record<ComplianceStatus, { label: string; className: string }> = {
  CURRENT: { label: 'Current', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  DUE_SOON: { label: 'Due Soon', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  OVERDUE: { label: 'Overdue', className: 'bg-rose-50 text-rose-700 border-rose-100' },
  NOT_ESTABLISHED: { label: 'Not Established', className: 'bg-navy-50 text-navy-500 border-navy-100' },
};
