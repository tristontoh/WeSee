import { EmissionsResponse, scopeTotals } from './emissions.model';

const data: EmissionsResponse = {
  scope1: [{ fiscalYear: 2026, value: 184.2 }],
  scope2: [{ fiscalYear: 2026, value: 97.6 }],
  scope3: [
    {
      id: 'a',
      name: 'Category 1',
      tooltip: null,
      standardCategoryNumber: 1,
      mandatory: false,
      values: [{ fiscalYear: 2026, value: 400, transitionRelief: false }],
    },
    {
      id: 'b',
      name: 'Category 2',
      tooltip: null,
      standardCategoryNumber: 2,
      mandatory: false,
      values: [{ fiscalYear: 2026, value: 32.8, transitionRelief: false }],
    },
  ],
};

describe('scopeTotals', () => {
  it('sums each scope for the requested year', () => {
    const t = scopeTotals(data, 2026);
    expect(t.scope1).toBe(184.2);
    expect(t.scope2).toBe(97.6);
    expect(t.scope3).toBe(432.8);
    expect(t.total).toBeCloseTo(714.6, 5);
  });

  it('splits percentages that sum to exactly 100', () => {
    const t = scopeTotals(data, 2026);
    expect(t.pct1 + t.pct2 + t.pct3).toBe(100);
  });

  it('ignores values from other fiscal years', () => {
    const t = scopeTotals(data, 2025);
    expect(t.total).toBe(0);
  });

  it('handles a company with no data at all', () => {
    const t = scopeTotals({ scope1: [], scope2: [], scope3: [] }, 2026);
    expect(t.total).toBe(0);
    expect(t.pct1).toBe(0);
    expect(t.pct2).toBe(0);
    expect(t.pct3).toBe(0);
  });

  it('handles a null response before the first load resolves', () => {
    expect(scopeTotals(null, 2026).total).toBe(0);
  });

  it('does not leak floating-point noise into a scope 3 sum', () => {
    // Regression: 268.4 + 96.2 + 41.7 + 26.5 rendered as 432.79999999999995 on screen.
    const noisy: EmissionsResponse = {
      scope1: [],
      scope2: [],
      scope3: [268.4, 96.2, 41.7, 26.5].map((v, i) => ({
        id: `c${i}`,
        name: `Category ${i}`,
        tooltip: null,
        standardCategoryNumber: i + 1,
        mandatory: false,
        values: [{ fiscalYear: 2026, value: v, transitionRelief: false }],
      })),
    };
    const t = scopeTotals(noisy, 2026);
    expect(t.scope3).toBe(432.8);
    expect(String(t.scope3)).not.toContain('999');
    expect(t.total).toBe(432.8);
  });

  it('sums scope 3 across standard and custom categories alike', () => {
    const withCustom: EmissionsResponse = {
      ...data,
      scope3: [
        ...data.scope3,
        {
          id: 'c',
          name: 'Custom',
          tooltip: null,
          standardCategoryNumber: null,
          mandatory: false,
          values: [{ fiscalYear: 2026, value: 10, transitionRelief: false }],
        },
      ],
    };
    expect(scopeTotals(withCustom, 2026).scope3).toBe(442.8);
  });
});
