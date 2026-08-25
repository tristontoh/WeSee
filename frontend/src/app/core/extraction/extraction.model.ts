export type ExtractionStatus = 'PENDING' | 'EXTRACTING' | 'READY' | 'FAILED';
export type ExtractionTargetType = 'EMISSION_ACTIVITY' | 'INDICATOR_VALUE';
export type RecordStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

export interface ExtractedRecordResponse {
  id: string;
  targetType: ExtractionTargetType;
  targetId: string;
  targetName: string;
  value: number;
  /** The unit `value` is in, after conversion into the target's own unit. */
  unit: string;
  /** What the document printed, which may differ — 1,240 kWh read, 1.24 MWh stored. */
  unitAsRead: string | null;
  fiscalYear: number;
  month: number | null;
  confidence: number | null;
  sourceSnippet: string | null;
  status: RecordStatus;
}

export interface ExtractedDocumentResponse {
  id: string;
  originalFileName: string;
  status: ExtractionStatus;
  failureReason: string | null;
  uploadedBy: string;
  createdAt: string;
  /** Absent until the document has been read. */
  modelUsed: string | null;
  records: ExtractedRecordResponse[];
}

/** A document is still being worked on by the backend and the queue should keep polling. */
export function isPending(doc: ExtractedDocumentResponse): boolean {
  return doc.status === 'PENDING' || doc.status === 'EXTRACTING';
}
