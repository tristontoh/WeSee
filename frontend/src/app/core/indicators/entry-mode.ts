import { AggregationRule } from './indicators.model';

export type EntryMode = 'annual' | 'monthly';

/**
 * Which endpoint accepts a value for this indicator. The backend enforces this with a 409:
 * DIRECT_ANNUAL rejects monthly writes, and every other rule rejects annual writes, because
 * their annual figure is computed from the twelve months. So this is never a user choice.
 */
export function entryMode(rule: AggregationRule): EntryMode {
  return rule === 'DIRECT_ANNUAL' ? 'annual' : 'monthly';
}

export function currentFiscalYear(): number {
  return new Date().getFullYear();
}
