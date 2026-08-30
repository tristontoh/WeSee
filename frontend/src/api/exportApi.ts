/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';
import { saveText } from '../utils/download';

export type ExportFormat = 'PDF' | 'WORD' | 'CSV' | 'CSV_CSI';

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

export const exportApi = {
  csv: (fiscalYear: number) => apiClient.post<string>('/api/v1/exports/csv', undefined, { fiscalYear }),

  csi: (fiscalYear: number) => apiClient.post<string>('/api/v1/exports/csi', undefined, { fiscalYear }),

  history: () => apiClient.get<ExportHistoryResponse[]>('/api/v1/exports/history'),

  /**
   * `record` decides whether this shows up in the export history. Pass false for a preview:
   * looking at a draft is not issuing a report, and the history is the sign-off ledger.
   */
  integratedReportPdf: (fiscalYear: number, record = true) =>
    apiClient.getBlob(`/api/v1/exports/integrated-report.pdf?fiscalYear=${fiscalYear}&record=${record}`),

  ifrsS1ReportPdf: (fiscalYear: number, record = true) =>
    apiClient.getBlob(`/api/v1/exports/ifrs-s1-report.pdf?fiscalYear=${fiscalYear}&record=${record}`),

  ifrsS2ReportPdf: (fiscalYear: number, record = true) =>
    apiClient.getBlob(`/api/v1/exports/ifrs-s2-report.pdf?fiscalYear=${fiscalYear}&record=${record}`),

  log: (exportType: string, format: ExportFormat, fiscalYear: number) =>
    apiClient.post<void>('/api/v1/exports/log', { exportType, format, fiscalYear }),

  signOff: (id: string) => apiClient.patch<ExportHistoryResponse>(`/api/v1/exports/history/${id}/sign-off`),
};

export function downloadCsv(content: string, filename: string) {
  saveText(content, filename, 'text/csv;charset=utf-8;');
}
