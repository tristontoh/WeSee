export type SignOffStatus = 'SIGNED' | 'REVOKED';
export type AssuranceLevel = 'INTERNAL_REVIEW' | 'EXTERNAL_LIMITED' | 'EXTERNAL_REASONABLE';
export type ExportFormat = 'PDF' | 'WORD' | 'CSV' | 'CSV_CSI';

export const ASSURANCE_LEVELS: { value: AssuranceLevel; label: string }[] = [
  { value: 'INTERNAL_REVIEW', label: 'Internal review' },
  { value: 'EXTERNAL_LIMITED', label: 'External — limited assurance' },
  { value: 'EXTERNAL_REASONABLE', label: 'External — reasonable assurance' },
];

export interface SignOffResponse {
  fiscalYear: number;
  status: SignOffStatus;
  signerName: string | null;
  signerTitle: string | null;
  notes: string | null;
  /** Tamper-evident digest of the signed data set. */
  hash: string | null;
  signedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string | null;
  assuranceLevel: AssuranceLevel | null;
  externalAssurerName: string | null;
  standardReferenced: string | null;
  nextExternalAssuranceDeadline: string | null;
}

export interface SignOffAuditEntryResponse {
  action: SignOffStatus;
  actorName: string | null;
  actorTitle: string | null;
  notes: string | null;
  hash: string | null;
  timestamp: string;
}

export interface ExportHistoryResponse {
  id: string;
  generatedAt: string;
  exportType: string;
  format: ExportFormat;
  fiscalYear: number;
  generatedByName: string | null;
  signedOffByName: string | null;
  signedOffAt: string | null;
}
