export type IndicatorCategory = 'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE';
export type AggregationRule = 'SUM' | 'LATEST' | 'AVERAGE' | 'COUNT' | 'DIRECT_ANNUAL';
export type TargetDirection = 'UP' | 'DOWN';
export type IndicatorValueStatus = 'DRAFT' | 'APPROVED';

export interface IndicatorValuePointDto {
  fiscalYear: number;
  value: number;
  status: IndicatorValueStatus;
  approvedByName: string | null;
  approvedAt: string | null;
  isComputed: boolean;
  monthsReported: number;
}

export interface IndicatorMonthlyValueDto {
  fiscalYear: number;
  month: number;
  value: number;
  enteredBy: string | null;
  enteredAt: string | null;
  sourceDocName: string | null;
  sourceDocPath: string | null;
}

export interface AuditEntryDto {
  fiscalYear: number;
  month: number | null;
  value: number;
  enteredBy: string | null;
  enteredAt: string | null;
  sourceDocName: string | null;
  sourceDocPath: string | null;
  comment: string | null;
}

export interface IndicatorResponse {
  id: string;
  name: string;
  unit: string;
  matterId: string;
  category: IndicatorCategory;
  sectorSpecific: boolean;
  /** Omitted from the JSON when null. */
  sectorCode?: string | null;
  effectiveTarget: number | null;
  effectiveTargetDirection: TargetDirection | null;
  enabled: boolean;
  aggregationRule: AggregationRule;
  values: IndicatorValuePointDto[];
  monthlyValues: IndicatorMonthlyValueDto[];
  history: AuditEntryDto[];
}

export const CATEGORY_LABELS: Record<IndicatorCategory, string> = {
  ENVIRONMENTAL: 'Environmental',
  SOCIAL: 'Social',
  GOVERNANCE: 'Governance',
};

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
