export interface EmissionPointDto {
  fiscalYear: number;
  value: number;
}

export interface Scope3ValuePointDto {
  fiscalYear: number;
  value: number;
  /** Read-only here: the rule that sets it lives in transition_relief_rule with no write endpoint. */
  transitionRelief: boolean;
}

export interface Scope3CategoryResponse {
  id: string;
  name: string;
  tooltip: string | null;
  /** 1–15 for the GHG Protocol categories; null for custom ones. */
  standardCategoryNumber: number | null;
  mandatory: boolean;
  values: Scope3ValuePointDto[];
}

export interface EmissionsResponse {
  scope1: EmissionPointDto[];
  scope2: EmissionPointDto[];
  scope3: Scope3CategoryResponse[];
}

export interface ScopeTotals {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  /** Whole-number percentages that always sum to 100 when total > 0. */
  pct1: number;
  pct2: number;
  pct3: number;
}

const valueFor = (points: { fiscalYear: number; value: number }[], year: number): number =>
  Number(points.find((p) => p.fiscalYear === year)?.value ?? 0);

/**
 * Collapses an EmissionsResponse into the three scope figures for one year plus their split.
 * Scope 3 is the sum across every category, standard and custom alike.
 */
export function scopeTotals(data: EmissionsResponse | null, year: number): ScopeTotals {
  if (!data) return { scope1: 0, scope2: 0, scope3: 0, total: 0, pct1: 0, pct2: 0, pct3: 0 };

  const scope1 = valueFor(data.scope1, year);
  const scope2 = valueFor(data.scope2, year);
  const scope3 = data.scope3.reduce((sum, c) => sum + valueFor(c.values, year), 0);
  const total = scope1 + scope2 + scope3;

  if (total === 0) return { scope1, scope2, scope3, total: 0, pct1: 0, pct2: 0, pct3: 0 };

  const pct1 = Math.round((scope1 / total) * 100);
  const pct2 = Math.round((scope2 / total) * 100);
  // Third share absorbs rounding so the three always sum to exactly 100.
  return { scope1, scope2, scope3, total, pct1, pct2, pct3: 100 - pct1 - pct2 };
}
