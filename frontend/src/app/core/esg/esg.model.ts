import { IndicatorCategory } from '../indicators/indicators.model';

// ---------- materiality ----------

export type AssessmentStatus = 'DRAFT' | 'VALIDATED';

export interface StakeholderOptionResponse {
  id: string;
  name: string;
  selected: boolean;
  custom: boolean;
}

export interface ScoreResponse {
  matterId: string;
  matterName: string;
  category: IndicatorCategory;
  /** 1–5, enforced by the backend. */
  impact: number;
  influence: number;
  rationale: string | null;
  priorityTier: string;
}

export interface AssessmentSummaryResponse {
  id: string;
  name: string;
  assessmentDate: string;
  planAtCapture: string;
  marketAtCapture: string | null;
  createdByName: string | null;
  status: AssessmentStatus;
  validatedByName: string | null;
  validatedAt: string | null;
}

export interface AssessmentDetailResponse extends AssessmentSummaryResponse {
  stakeholders: string[];
  scores: ScoreResponse[];
}

export interface ScoreInput {
  matterId: string;
  impact: number;
  influence: number;
  rationale?: string | null;
}

// ---------- governance ----------

export type OversightLevel = 'OVERSIGHT' | 'STRATEGIC' | 'IMPLEMENTATION';
export type ComplianceStatus = 'NOT_ESTABLISHED' | 'CURRENT' | 'DUE_SOON' | 'OVERDUE';

export const OVERSIGHT_LEVELS: { value: OversightLevel; label: string }[] = [
  { value: 'OVERSIGHT', label: 'Oversight' },
  { value: 'STRATEGIC', label: 'Strategic' },
  { value: 'IMPLEMENTATION', label: 'Implementation' },
];

export const COMPLIANCE_LABELS: Record<ComplianceStatus, string> = {
  NOT_ESTABLISHED: 'Not established',
  CURRENT: 'Current',
  DUE_SOON: 'Due soon',
  OVERDUE: 'Overdue',
};

export interface GovernanceLevelResponse {
  level: OversightLevel;
  roleTitle: string | null;
  description: string | null;
}

export interface MatterOwnershipResponse {
  matterId: string;
  matterName: string;
  ownerName: string | null;
  oversightLevel: OversightLevel | null;
  notes: string | null;
}

export interface CompliancePolicyResponse {
  id: string;
  policyKey: string | null;
  name: string;
  description: string | null;
  reviewCycleMonths: number;
  lastReviewedAt: string | null;
  nextReviewDueAt: string | null;
  documentUrl: string | null;
  status: ComplianceStatus;
  mandatory: boolean;
}

// ---------- targets ----------

export interface PerformanceTargetResponse {
  id: string;
  title: string;
  description: string | null;
  baselineYear: number;
  targetYear: number;
  targetValue: number;
  currentProgress: number;
  indicatorId: string | null;
  /** True when progress is derived from the linked indicator rather than typed in. */
  progressComputed: boolean;
  horizon: string | null;
}

export interface UpsertPerformanceTargetRequest {
  title: string;
  description?: string | null;
  baselineYear: number;
  targetYear: number;
  targetValue: number;
  currentProgress?: number | null;
  indicatorId?: string | null;
  horizon?: string | null;
}
