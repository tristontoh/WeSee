/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';

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
  /**
   * The sustainability matter behind this reading — what makes a water bill tell itself apart from
   * an electricity bill. Null on emission-factor readings, which carry a scope rather than a matter;
   * the paired indicator reading on the same document supplies it.
   */
  matterId: string | null;
  matterName: string | null;
  status: RecordStatus;
}

/** A labelled value printed outside any table. */
export interface TranscribedField {
  label: string;
  /**
   * A short English gloss of the label, shown beside the original rather than instead of it — this
   * card's job is to show what the page says, and a Malaysian utility bill says "Tempoh Bil".
   * Null when the label is already English, and on rows transcribed before glossing existed.
   */
  labelEnglish: string | null;
  value: string;
}

/** One table as printed. Rows are ragged when the document merges or leaves cells blank. */
export interface TranscribedTable {
  title: string | null;
  titleEnglish: string | null;
  columns: string[];
  /** Positional gloss per column. May be shorter than `columns`, so index before you read. */
  columnsEnglish: string[];
  rows: string[][];
  /**
   * Positional gloss per cell, in the same shape as `rows`. Present only for the descriptive
   * cells: a line item like "Baki Terdahulu" glosses, a figure or a meter number does not, and
   * those arrive as an empty string. Ragged, shorter than `rows`, or absent on rows transcribed
   * before cell glossing existed — read it through `cellGloss`.
   */
  rowsEnglish: string[][];
}

/** The gloss for one cell, or null when there is none. Tolerates a ragged or absent `rowsEnglish`. */
export function cellGloss(table: TranscribedTable, rowIndex: number, columnIndex: number): string | null {
  const gloss = table.rowsEnglish?.[rowIndex]?.[columnIndex];
  return gloss && gloss.trim() !== '' ? gloss : null;
}

/**
 * What the document says, as printed — descriptive, never reviewed. Distinct from the records:
 * a figure with no matching indicator lives here and nowhere else, which is how everything on a
 * bill gets captured without anything being forced into an indicator that does not mean it.
 */
export interface DocumentTranscription {
  fields: TranscribedField[];
  tables: TranscribedTable[];
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
  transcription: DocumentTranscription;
  records: ExtractedRecordResponse[];
}

export interface AcceptRecordRequest {
  value?: number;
  fiscalYear?: number;
  month?: number;
  /** Files the reading against the whole year. Omitting `month` cannot say this — see the DTO. */
  clearMonth?: boolean;
}

/** A document is still being worked on by the backend and the queue should keep polling. */
export function isPending(doc: ExtractedDocumentResponse): boolean {
  return doc.status === 'PENDING' || doc.status === 'EXTRACTING';
}

const BASE = '/api/v1/extraction';

export const extractionApi = {
  list: () => apiClient.get<ExtractedDocumentResponse[]>(`${BASE}/documents`),

  get: (id: string) => apiClient.get<ExtractedDocumentResponse>(`${BASE}/documents/${id}`),

  /**
   * The stored document itself, for the detail screen's preview.
   *
   * Fetched as a blob rather than pointed at with `<img src>` or `<iframe src>`: those cannot
   * carry the Authorization header, and the endpoint is tenant-scoped. The caller turns this into
   * an object URL — and must revoke it, or every visit leaks one.
   */
  file: (id: string) => apiClient.getBlob(`${BASE}/documents/${id}/file`),

  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.postFile<ExtractedDocumentResponse>(`${BASE}/documents`, form);
  },

  retry: (id: string) => apiClient.post<ExtractedDocumentResponse>(`${BASE}/documents/${id}/retry`, {}),

  accept: (recordId: string, body: AcceptRecordRequest) =>
    apiClient.post<ExtractedRecordResponse>(`${BASE}/records/${recordId}/accept`, body),

  reject: (recordId: string) =>
    apiClient.post<ExtractedRecordResponse>(`${BASE}/records/${recordId}/reject`, {}),
};
