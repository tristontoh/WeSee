import { sectorIcon, FALLBACK_ICON } from './sector-icons';

describe('sectorIcon', () => {
  it('returns a distinct icon for each seeded sector code', () => {
    const codes = [
      'AGRICULTURE_PLANTATION',
      'CONSTRUCTION_PROPERTY',
      'CONSUMER_RETAIL',
      'ENERGY_OIL_GAS',
      'FINANCIAL_SERVICES',
      'HEALTHCARE_PHARMA',
      'MANUFACTURING',
      'TECHNOLOGY_SOFTWARE',
    ];
    const icons = codes.map(sectorIcon);
    icons.forEach((i) => expect(i).not.toBe(FALLBACK_ICON));
    expect(new Set(icons).size).toBe(codes.length);
  });

  it('falls back for a code the platform admin added later', () => {
    expect(sectorIcon('SOMETHING_NEW')).toBe(FALLBACK_ICON);
  });

  it('falls back for an empty or null code', () => {
    expect(sectorIcon('')).toBe(FALLBACK_ICON);
    expect(sectorIcon(null as unknown as string)).toBe(FALLBACK_ICON);
  });
});
