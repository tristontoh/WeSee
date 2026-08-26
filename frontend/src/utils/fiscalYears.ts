/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** How many years back from the current one always appear, even with nothing entered against them. */
const DEFAULT_SPAN = 4;

/**
 * The fiscal years a screen should offer, as `FY####` keys, oldest first.
 *
 * Three screens each hard-coded `['FY2023' … 'FY2026']`, which meant a figure outside that window
 * had nowhere to appear: a 2021 utility bill could be read correctly, accepted correctly, and then
 * be invisible everywhere, because no column existed for its year.
 *
 * So the window is the recent span *plus* any year the company actually holds data for. A year with
 * data is never hidden, and an empty year outside the span is never conjured up.
 */
export function fiscalYearKeys(yearsWithData: Iterable<number> = [], now = new Date()): string[] {
  const current = now.getFullYear();
  const years = new Set<number>();

  for (let i = 0; i < DEFAULT_SPAN; i++) {
    years.add(current - i);
  }
  for (const year of yearsWithData) {
    // Guards against a misread date putting a "FY0037" column on the screen.
    if (Number.isInteger(year) && year >= 1900 && year <= current + 1) {
      years.add(year);
    }
  }

  return [...years].sort((a, b) => a - b).map((y) => `FY${y}`);
}

/** `FY2026` → `2026`. Returns NaN for anything that is not one of these keys. */
export function fiscalYearNumber(key: string): number {
  return parseInt(key.replace('FY', ''), 10);
}
