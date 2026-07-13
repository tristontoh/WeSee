export function tierStyle(tier: string): { bg: string; fg: string } {
  if (tier === 'System-Verified' || tier === 'Enterprise-Ingested') return { bg: '#E7F0F2', fg: '#CBDCDF' };
  return { bg: '#F9E6EF', fg: '#D96BA1' };
}

export interface SupplierDoc {
  name: string;
  date: string;
}

export interface Supplier {
  id: string;
  name: string;
  tier: string;
  trust: string;
  total: string;
  s1: string;
  s2: string;
  s3: string;
  s1pct: string;
  s2pct: string;
  s3pct: string;
  docCount: string;
  docs: SupplierDoc[];
}

export const SUPPLIERS: Record<string, Supplier> = {
  s1: {
    id: 's1', name: 'Kian Joo Packaging', tier: 'System-Verified', trust: '100%', total: '212.4',
    s1: '61.2', s2: '48.0', s3: '103.2', s1pct: '29%', s2pct: '23%', s3pct: '48%', docCount: '14',
    docs: [{ name: 'Q2 utility bills.pdf', date: 'Jun 2026' }, { name: 'Fleet fuel log.xlsx', date: 'Jun 2026' }, { name: 'Freight manifests.zip', date: 'May 2026' }],
  },
  s2: {
    id: 's2', name: 'Green Harvest Palm', tier: 'Enterprise-Ingested', trust: '92%', total: '486.9',
    s1: '210.0', s2: '96.9', s3: '180.0', s1pct: '43%', s2pct: '20%', s3pct: '37%', docCount: '9',
    docs: [{ name: 'Mill energy report.pdf', date: 'Jun 2026' }, { name: 'Transport slips.pdf', date: 'May 2026' }],
  },
  s3: {
    id: 's3', name: 'Delta Freight Sdn', tier: 'Unverified', trust: '45%', total: '318.5',
    s1: '188.0', s2: '40.5', s3: '90.0', s1pct: '59%', s2pct: '13%', s3pct: '28%', docCount: '2',
    docs: [{ name: 'Self-reported estimate.csv', date: 'Apr 2026' }],
  },
};

export const NOTIFICATIONS = [
  { text: 'Extraction complete for 3 uploaded invoices.', time: '12 min ago', dotColor: '#4C96B3' },
  { text: 'Sunway Group Bhd accepted your assurance invite.', time: '2 hours ago', dotColor: '#CBDCDF' },
  { text: '2 claims flagged for unverified evidence.', time: 'Yesterday', dotColor: '#F1A6CC' },
];

export const SECTORS = [
  { key: 'electronics', label: 'Electronics', d: 'M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m14 0h2M3 15h2m14 0h2M6 6h12v12H6z' },
  { key: 'palm', label: 'Palm Oil', d: 'M12 22V8M12 8c0-3 2-5 5-5-1 3-2 5-5 5zM12 8c0-3-2-5-5-5 1 3 2 5 5 5z' },
  { key: 'textiles', label: 'Textiles', d: 'M4 4l4 2 4-2 4 2 4-2v6l-4 2v8H8v-8L4 10z' },
  { key: 'freight', label: 'Freight', d: 'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 21a2 2 0 100-4 2 2 0 000 4zM18.5 21a2 2 0 100-4 2 2 0 000 4z' },
  { key: 'food', label: 'Food & Bev', d: 'M6 2v7a3 3 0 006 0V2M9 2v20M17 2c-2 2-3 4-3 7s1 4 3 4v9' },
  { key: 'construction', label: 'Construction', d: 'M2 20h20M4 20V8l8-5 8 5v12M9 20v-6h6v6' },
];

export const CAT_BARS = [
  { label: 'Purchased goods', val: '241.0', pct: '100%', color: '#4C96B3' },
  { label: 'Fuel & energy', val: '156.4', pct: '65%', color: '#CBDCDF' },
  { label: 'Freight & logistics', val: '118.2', pct: '49%', color: '#D96BA1' },
  { label: 'Business travel', val: '74.8', pct: '31%', color: '#4D7E86' },
  { label: 'Waste', val: '42.1', pct: '18%', color: '#4D7E86' },
];

export const UPLOADS = [
  { name: 'TNB_electricity_jun2026.pdf', size: '1.2 MB', tagBg: '#E7F0F2', tagFg: '#CBDCDF', type: 'Utility bill', status: 'Extracted', statusFg: '#4C96B3', statusIcon: '✓' },
  { name: 'petronas_fleet_fuel.jpg', size: '3.4 MB', tagBg: '#F9E6EF', tagFg: '#D96BA1', type: 'Fuel slip', status: 'Extracting…', statusFg: '#D96BA1', statusIcon: '◌' },
  { name: 'DHL_manifest_wk24.pdf', size: '860 KB', tagBg: '#FCEFF5', tagFg: '#c66ba8', type: 'Freight manifest', status: 'Queued', statusFg: '#93A099', statusIcon: '○' },
  { name: 'IWK_water_bill_may.pdf', size: '540 KB', tagBg: '#E7F0F2', tagFg: '#CBDCDF', type: 'Utility bill', status: 'Queued', statusFg: '#93A099', statusIcon: '○' },
];

export interface ExtractionSeed {
  id: string;
  field: string;
  value: string;
  conf: string;
  confPct: string;
  level: 'high' | 'medium' | 'low';
  source: string;
  reviewStatus: string;
  color: string;
  label: string;
  accent: string;
  statusBg: string;
  statusFg: string;
}

const CONF_STYLE: Record<string, { color: string; label: string; accent: string; statusBg: string; statusFg: string }> = {
  high: { color: '#CBDCDF', label: 'High', accent: '#CBDCDF', statusBg: '#E7F0F2', statusFg: '#CBDCDF' },
  medium: { color: '#D96BA1', label: 'Medium', accent: '#D96BA1', statusBg: '#F9E6EF', statusFg: '#D96BA1' },
  low: { color: '#F1A6CC', label: 'Low', accent: '#F1A6CC', statusBg: '#FCEFF5', statusFg: '#F1A6CC' },
};

export const EXTRACTIONS_SEED: ExtractionSeed[] = [
  { id: 'e1', field: 'ELECTRICITY CONSUMPTION', value: '4,820 kWh', conf: '98%', confPct: '98%', level: 'high', source: 'TNB bill · page 1', reviewStatus: 'Auto-approved', ...CONF_STYLE['high'] },
  { id: 'e2', field: 'DIESEL VOLUME', value: '1,240 L', conf: '91%', confPct: '91%', level: 'high', source: 'Petronas slip · page 1', reviewStatus: 'Auto-approved', ...CONF_STYLE['high'] },
  { id: 'e3', field: 'FREIGHT DISTANCE', value: '2,180 km', conf: '64%', confPct: '64%', level: 'medium', source: 'DHL manifest · page 2', reviewStatus: 'Needs review', ...CONF_STYLE['medium'] },
  { id: 'e4', field: 'REFRIGERANT TOP-UP', value: '3.5 kg', conf: '38%', confPct: '38%', level: 'low', source: 'Handwritten note · page 1', reviewStatus: 'Flagged', ...CONF_STYLE['low'] },
];

export const TRUST_FACTORS = [
  { label: 'Connected to verified buyer', detail: 'Sunway Group · streaming live', sign: '+', bg: '#E4EEF0', fg: '#4C96B3', delta: '+22' },
  { label: 'Documents from primary sources', detail: '11 of 14 utility-issued', sign: '+', bg: '#E4EEF0', fg: '#4C96B3', delta: '+18' },
  { label: 'High extraction confidence', detail: 'Avg 91% across fields', sign: '+', bg: '#E4EEF0', fg: '#4C96B3', delta: '+14' },
  { label: 'Unreviewed flagged fields', detail: '2 fields below 50%', sign: '−', bg: '#FCEFF5', fg: '#F1A6CC', delta: '−9' },
  { label: 'Missing Scope 3 coverage', detail: '3 categories not yet mapped', sign: '−', bg: '#F9E6EF', fg: '#D96BA1', delta: '−7' },
];

export const EXPORT_HISTORY = [
  { period: 'Q1 2026', method: 'Streamed', mBg: '#E4EEF0', mFg: '#4C96B3', hash: '0x8f2a…c419', ts: '3 Apr 2026, 14:22' },
  { period: 'FY2025', method: 'Watermarked PDF', mBg: '#EEF1EC', mFg: '#64726B', hash: '0x1b7d…9e02', ts: '12 Jan 2026, 09:41' },
  { period: 'Q4 2025', method: 'Streamed', mBg: '#E4EEF0', mFg: '#4C96B3', hash: '0x44ce…af88', ts: '5 Jan 2026, 16:03' },
  { period: 'Q3 2025', method: 'Watermarked PDF', mBg: '#EEF1EC', mFg: '#64726B', hash: '0xa290…7d15', ts: '2 Oct 2025, 11:18' },
];

export interface LedgerRow {
  id: string | null;
  name: string;
  tier: string;
  trust: string;
  total: string;
  source: string;
  conn: string;
  connFg: string;
  connIcon: string;
  tierBg: string;
  tierFg: string;
  openId: string;
}

const CONN = {
  yes: { conn: 'Connected', connFg: '#4C96B3', connIcon: '●' },
  no: { conn: 'Disconnected', connFg: '#B4BEB7', connIcon: '○' },
};

export const LEDGER_ROWS: LedgerRow[] = [
  ...(['s1', 's2', 's3'] as const).map((id, i) => {
    const s = SUPPLIERS[id];
    const ts = tierStyle(s.tier);
    const source = [CONN.yes, CONN.yes, CONN.no][i] === CONN.no ? 'Self-reported CSV' : i === 0 ? 'System-verified stream' : 'Enterprise ingestion';
    const conn = i === 2 ? CONN.no : CONN.yes;
    return { id, name: s.name, tier: s.tier, trust: s.trust, total: s.total, source, ...conn, tierBg: ts.bg, tierFg: ts.fg, openId: id };
  }),
  ...[
    { name: 'Perak Steel Works', tier: 'System-Verified', trust: '100%', total: '904.1', source: 'System-verified stream', ...CONN.yes },
    { name: 'Nusantara Logistics', tier: 'Enterprise-Ingested', trust: '92%', total: '540.8', source: 'Enterprise ingestion', ...CONN.yes },
    { name: 'Klang Chemicals Bhd', tier: 'Unverified', trust: '45%', total: '672.3', source: 'Estimated (industry avg)', ...CONN.no },
  ].map((r) => ({ id: null, ...r, ...tierStyle2(r.tier), openId: 's1' })),
];

function tierStyle2(tier: string) {
  const s = tierStyle(tier);
  return { tierBg: s.bg, tierFg: s.fg };
}

export interface ArbitrageSeed {
  id: string;
  category: string;
  from: string;
  to: string;
  co2: string;
  rm: string;
  curPct: string;
  curVal: string;
  altPct: string;
  altVal: string;
  trust: string;
  lead: string;
}

export const ARBITRAGE_SEED: ArbitrageSeed[] = [
  { id: 'a1', category: 'FREIGHT & LOGISTICS', from: 'Delta Freight', to: 'Nusantara Logistics', co2: '184 tCO₂e', rm: 'RM 92K', curPct: '100%', curVal: '318 t', altPct: '42%', altVal: '134 t', trust: '92%', lead: '+2 days' },
  { id: 'a2', category: 'RAW MATERIALS · STEEL', from: 'Klang Steel', to: 'Perak Steel Works', co2: '241 tCO₂e', rm: 'RM 60K', curPct: '100%', curVal: '672 t', altPct: '64%', altVal: '431 t', trust: '100%', lead: 'same' },
];

export interface ClaimSeed {
  id: string;
  text: string;
  evidence: string;
  confLabel: string;
  confBg: string;
  confFg: string;
  flagged: boolean;
  doc: string;
  page: string;
  snippet: string;
}

export const CLAIMS_SEED: ClaimSeed[] = [
  { id: 'c1', text: 'Total Scope 1 & 2 emissions for FY2026 were 4,368 tCO₂e, a 4.2% reduction year-over-year.', evidence: 'Consolidated ledger', confLabel: 'High confidence', confBg: '#E4EEF0', confFg: '#4C96B3', flagged: false, doc: 'Assurance ledger export', page: '3', snippet: 'Scope 1: 2,826 tCO₂e   Scope 2: 1,542 tCO₂e   Total: 4,368' },
  { id: 'c2', text: '82% of procurement spend is covered by system-verified supplier emissions data.', evidence: 'Supplier ledger', confLabel: 'High confidence', confBg: '#E4EEF0', confFg: '#4C96B3', flagged: false, doc: 'Supplier assurance ledger', page: '1', snippet: 'Verified suppliers: 31 / 38   Spend coverage: 82.4%' },
  { id: 'c3', text: 'Scope 3 freight emissions declined 12% following supplier optimisation initiatives.', evidence: 'Delta Freight (self-reported)', confLabel: 'Low confidence', confBg: '#FCEFF5', confFg: '#F1A6CC', flagged: true, doc: 'Self-reported estimate.csv', page: '1', snippet: 'freight_tco2e_q2 = 90.0   (source: manual entry, unverified)' },
  { id: 'c4', text: 'RM 2.4M in sustainability-linked loan margin was unlocked this period.', evidence: 'Treasury reconciliation', confLabel: 'Medium confidence', confBg: '#F9E6EF', confFg: '#D96BA1', flagged: false, doc: 'SLL facility statement', page: '2', snippet: 'Margin adjustment: -18bps   Est. annual benefit: RM 2,400,000' },
];

const FW_STATUS = {
  ready: { status: 'Ready', stBg: '#E4EEF0', stFg: '#4C96B3', stIcon: '✓', btnLabel: 'Generate export', btnBg: '#4C96B3', btnFg: '#fff', btnBorder: '#4C96B3' },
  gen: { status: 'Generating', stBg: '#F9E6EF', stFg: '#D96BA1', stIcon: '◌', btnLabel: 'Generating…', btnBg: '#fff', btnFg: '#D96BA1', btnBorder: '#CBDCDF' },
  failed: { status: 'Failed', stBg: '#FCEFF5', stFg: '#F1A6CC', stIcon: '!', btnLabel: 'Retry export', btnBg: '#fff', btnFg: '#F1A6CC', btnBorder: '#F5DCE9' },
};

export const FRAMEWORKS = [
  { mark: 'CSI', name: 'Bursa CSI', full: 'Malaysia listing requirement', iconBg: '#E4EEF0', iconFg: '#4C96B3', coverage: 'All 11 common indicators mapped · 100% coverage', ...FW_STATUS.ready },
  { mark: 'ISSB', name: 'ISSB S2', full: 'IFRS climate disclosures', iconBg: '#E7F0F2', iconFg: '#CBDCDF', coverage: 'Cross-industry metrics mapped · generating claims', ...FW_STATUS.gen },
  { mark: 'SEDG', name: 'SEDG', full: 'Sustainable Economy Disclosure', iconBg: '#F9E6EF', iconFg: '#D96BA1', coverage: 'Ready · last generated 2 Jul 2026', ...FW_STATUS.ready },
  { mark: 'SASB', name: 'SASB', full: 'Industry-specific standards', iconBg: '#FCEFF5', iconFg: '#F1A6CC', coverage: 'Missing 2 required Scope 3 categories', ...FW_STATUS.failed },
];

export const VERSIONS = [
  { ver: 'v4', name: 'Bursa CSI · FY2026', hash: '0x9d21…f7a0', ts: '5 Jul 2026' },
  { ver: 'v3', name: 'ISSB S2 · FY2026', hash: '0x3ca8…1b44', ts: '28 Jun 2026' },
  { ver: 'v2', name: 'Bursa CSI · FY2026', hash: '0x77ee…9c02', ts: '14 Jun 2026' },
  { ver: 'v1', name: 'SEDG · FY2026', hash: '0x02bd…44a1', ts: '2 Jun 2026' },
];

const T_STATUS = {
  active: { status: 'Active', stFg: '#4C96B3' },
  trial: { status: 'Trial', stFg: '#D96BA1' },
  susp: { status: 'Suspended', stFg: '#F1A6CC' },
};
const T_TYPE = {
  sme: { type: 'SME', typeBg: '#E4EEF0', typeFg: '#4C96B3' },
  plc: { type: 'PLC', typeBg: '#F9E6EF', typeFg: '#D96BA1' },
};

export const TENANT_ROWS = [
  { name: 'Sunway Group Bhd', ...T_TYPE.plc, plan: 'PLC Enterprise', suppliers: '38', ...T_STATUS.active },
  { name: 'Rimba Electronics Sdn', ...T_TYPE.sme, plan: 'SME Starter', suppliers: '—', ...T_STATUS.active },
  { name: 'Green Harvest Palm', ...T_TYPE.sme, plan: 'SME Starter', suppliers: '—', ...T_STATUS.trial },
  { name: 'IOI Corporation Bhd', ...T_TYPE.plc, plan: 'PLC Enterprise', suppliers: '124', ...T_STATUS.active },
  { name: 'Delta Freight Sdn', ...T_TYPE.sme, plan: 'SME Starter', suppliers: '—', ...T_STATUS.susp },
  { name: 'Petronas Chemicals', ...T_TYPE.plc, plan: 'PLC Enterprise', suppliers: '206', ...T_STATUS.active },
];

export const MAPPING_ROWS = [
  { field: 'C1(a) · GHG emissions Scope 1', metric: 'emissions.scope1_tco2e', unit: 'tCO₂e' },
  { field: 'C1(a) · GHG emissions Scope 2', metric: 'emissions.scope2_tco2e', unit: 'tCO₂e' },
  { field: 'C1(a) · GHG emissions Scope 3', metric: 'emissions.scope3_tco2e', unit: 'tCO₂e' },
  { field: 'C1(b) · Emission intensity', metric: 'emissions.intensity_rev', unit: 'tCO₂e/RMm' },
  { field: 'C4 · Energy consumption', metric: 'energy.total_mwh', unit: 'MWh' },
];

export const TOKEN_GRID = [
  { tenant: 'Rimba Electronics', state: 'Valid · healthy', color: '#4C96B3', quota: '62%' },
  { tenant: 'Green Harvest Palm', state: 'Valid · healthy', color: '#4C96B3', quota: '34%' },
  { tenant: 'Sunway Group', state: 'Quota near limit', color: '#D96BA1', quota: '88%' },
  { tenant: 'IOI Corporation', state: 'Valid · healthy', color: '#4C96B3', quota: '41%' },
  { tenant: 'Delta Freight', state: 'Invalid key', color: '#F1A6CC', quota: '0%' },
  { tenant: 'Petronas Chemicals', state: 'Quota exceeded', color: '#F1A6CC', quota: '100%' },
];

export const AUDIT_ROWS = [
  { actor: 'daniel.t@sunway', action: 'signed compliance export Bursa CSI v4', bg: '#E4EEF0', fg: '#4C96B3', d: 'M9 12l2 2 4-4M12 3l7 4v5c0 4-3 7-7 8-4-1-7-4-7-8V7z', hash: '0x9d21f7a0…prev 0x3ca81b44', ts: '5 Jul, 14:22' },
  { actor: 'system', action: 'auto-approved 42 high-confidence fields', bg: '#E7F0F2', fg: '#CBDCDF', d: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9', hash: '0x3ca81b44…prev 0x77ee9c02', ts: '5 Jul, 09:10' },
  { actor: 'sys.admin@wesee', action: 'overrode extraction e4 → flagged', bg: '#F9E6EF', fg: '#D96BA1', d: 'M11 4H4v16h16v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z', hash: '0x77ee9c02…prev 0x02bd44a1', ts: '4 Jul, 16:48' },
  { actor: 'aisyah.r@rimba', action: 'streamed Q2 emissions to Sunway ledger', bg: '#E4EEF0', fg: '#4C96B3', d: 'M22 2L11 13M22 2l-7 20-4-9-9-4z', hash: '0x02bd44a1…prev 0x8f2ac419', ts: '3 Jul, 11:02' },
  { actor: 'sys.admin@wesee', action: 'started impersonation session · Delta Freight', bg: '#FCEFF5', fg: '#F1A6CC', d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', hash: '0x8f2ac419…prev 0x44ceaf88', ts: '3 Jul, 08:30' },
];
