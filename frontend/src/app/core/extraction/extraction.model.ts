export type ExtractionStatus = 'PENDING' | 'EXTRACTING' | 'READY' | 'FAILED';
export type ExtractionTargetType = 'EMISSION_ACTIVITY' | 'INDICATOR_VALUE';
export type RecordStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

export interface ExtractedRecordResponse {
  id: string;
  targetType: ExtractionTargetType;
  targetId: string;
  targetName: string;
  value: number;
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
  records: ExtractedRecordResponse[];
}

/** A document is still being worked on by the backend and the queue should keep polling. */
export function isPending(doc: ExtractedDocumentResponse): boolean {
  return doc.status === 'PENDING' || doc.status === 'EXTRACTING';
}
