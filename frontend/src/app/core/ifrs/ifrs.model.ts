export type ReviewFrequency = 'MONTHLY' | 'QUARTERLY' | 'BI_ANNUALLY' | 'ANNUALLY';
export type IntegrationLevel = 'FULLY_INTEGRATED' | 'PARTIALLY_INTEGRATED' | 'STANDALONE_PROCESS';
export type TimeHorizon = 'SHORT' | 'MEDIUM' | 'LONG';
export type RiskOpportunityType = 'RISK' | 'OPPORTUNITY';
export type Currency = 'MYR' | 'USD' | 'EUR';

export const REVIEW_FREQUENCIES: { value: ReviewFrequency; label: string }[] = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'BI_ANNUALLY', label: 'Twice a year' },
  { value: 'ANNUALLY', label: 'Annually' },
];

export const INTEGRATION_LEVELS: { value: IntegrationLevel; label: string }[] = [
  { value: 'FULLY_INTEGRATED', label: 'Fully integrated' },
  { value: 'PARTIALLY_INTEGRATED', label: 'Partially integrated' },
  { value: 'STANDALONE_PROCESS', label: 'Standalone process' },
];

export const HORIZONS: { value: TimeHorizon; label: string }[] = [
  { value: 'SHORT', label: 'Short term' },
  { value: 'MEDIUM', label: 'Medium term' },
  { value: 'LONG', label: 'Long term' },
];

export const RO_TYPES: { value: RiskOpportunityType; label: string }[] = [
  { value: 'RISK', label: 'Risk' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
];

export const CURRENCIES: Currency[] = ['MYR', 'USD', 'EUR'];

/** IFRS S1 — general sustainability disclosures. */
export interface IfrsS1DisclosureResponse {
  oversightDescription: string | null;
  reviewFrequency: ReviewFrequency | null;
  responsibleCommittee: string | null;
  identificationProcess: string | null;
  integrationLevel: IntegrationLevel | null;
  trackedMetrics: string | null;
  targetsSummary: string | null;
  connectedInformation: string | null;
}

/** IFRS S2 — climate-specific disclosures. Everything S1 has, plus climate detail. */
export interface IfrsS2Response {
  oversightDescription: string | null;
  reviewFrequency: ReviewFrequency | null;
  responsibleCommittee: string | null;
  executiveRemunerationLinked: boolean | null;
  executiveRemunerationDescription: string | null;
  physicalRisks: string | null;
  transitionPlan: string | null;
  climateResilience: string | null;
  identificationProcess: string | null;
  integrationLevel: IntegrationLevel | null;
  trackedMetrics: string | null;
  reductionTargets: string | null;
  transitionRiskAssetPct: number | null;
  physicalRiskAssetPct: number | null;
  climateOpportunityAssetPct: number | null;
  climateCapex: number | null;
  climateCapexCurrency: Currency | null;
  carbonPricing: string | null;
  carbonPriceValue: number | null;
  carbonPriceCurrency: Currency | null;
}

export interface S1ItemResponse {
  id: string;
  title: string;
  type: RiskOpportunityType;
  description: string | null;
  horizon: TimeHorizon;
  financialImpact: number | null;
  currency: Currency;
}

export interface BusinessSegmentResponse {
  id: string;
  name: string;
  items: S1ItemResponse[];
}

export interface UpsertS1ItemRequest {
  title: string;
  type: RiskOpportunityType;
  description?: string | null;
  horizon: TimeHorizon;
  financialImpact?: number | null;
  currency: Currency;
}
