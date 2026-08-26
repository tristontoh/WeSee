/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TargetStatus = 'complete' | 'overdue' | 'on-track' | 'off-track' | 'not-started';

/**
 * Glide-path status: compares actual progress against the straight-line trajectory expected
 * between baselineYear and targetYear at the given currentYear. Single source of truth shared
 * by TargetsView and Dashboard so the two never drift apart.
 */
export function computeTargetStatus(
  target: { baselineYear: number; targetYear: number; currentProgress: number },
  currentYear: number
): TargetStatus {
  if (target.currentProgress >= 100) return 'complete';
  if (currentYear > target.targetYear) return 'overdue';
  if (currentYear <= target.baselineYear) return 'not-started';

  const expected = ((currentYear - target.baselineYear) / (target.targetYear - target.baselineYear)) * 100;
  const TOLERANCE = 10; // percentage points of slack before flagging off-track
  return target.currentProgress + TOLERANCE >= expected ? 'on-track' : 'off-track';
}

export const TARGET_STATUS_STYLES: Record<TargetStatus, { label: string; className: string }> = {
  complete: { label: 'Complete', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  'on-track': { label: 'On Track', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  'off-track': { label: 'Off Track', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  overdue: { label: 'Overdue', className: 'bg-rose-50 text-rose-700 border-rose-100' },
  'not-started': { label: 'Not Started', className: 'bg-navy-50 text-navy-500 border-navy-100' },
};
