/** Generic building glyph, used for any sector code we do not have art for. */
export const FALLBACK_ICON = 'M3 21h18M5 21V7l7-4 7 4v14M10 21v-6h4v6';

/**
 * The backend seeds eight sectors, but a platform admin can add more at runtime via
 * POST /admin/reference/…, so unknown codes must degrade rather than render blank.
 */
const ICONS: Record<string, string> = {
  AGRICULTURE_PLANTATION: 'M12 22V8M12 8c0-3 2-5 5-5-1 3-2 5-5 5zM12 8c0-3-2-5-5-5 1 3 2 5 5 5z',
  CONSTRUCTION_PROPERTY: 'M2 20h20M4 20V8l8-5 8 5v12M9 20v-6h6v6',
  CONSUMER_RETAIL: 'M6 2L3 6v14h18V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  ENERGY_OIL_GAS: 'M13 2L3 14h8l-1 8 10-12h-8z',
  FINANCIAL_SERVICES: 'M3 21h18M4 21V10M20 21V10M12 3L2 9h20zM8 21V10M16 21V10',
  HEALTHCARE_PHARMA: 'M12 4v16M4 12h16',
  MANUFACTURING: 'M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m14 0h2M3 15h2m14 0h2M6 6h12v12H6z',
  TECHNOLOGY_SOFTWARE: 'M8 6l-6 6 6 6M16 6l6 6-6 6',
};

export function sectorIcon(code: string): string {
  return (code && ICONS[code]) || FALLBACK_ICON;
}
