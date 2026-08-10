import { entryMode, currentFiscalYear } from './entry-mode';

describe('entryMode', () => {
  it('sends DIRECT_ANNUAL indicators to the annual endpoint', () => {
    expect(entryMode('DIRECT_ANNUAL')).toBe('annual');
  });

  it('sends every computed rule to the monthly endpoint', () => {
    expect(entryMode('SUM')).toBe('monthly');
    expect(entryMode('AVERAGE')).toBe('monthly');
    expect(entryMode('LATEST')).toBe('monthly');
    expect(entryMode('COUNT')).toBe('monthly');
  });
});

describe('currentFiscalYear', () => {
  it('returns a four-digit year', () => {
    const y = currentFiscalYear();
    expect(y).toBeGreaterThan(2000);
    expect(y).toBeLessThan(3000);
  });
});
