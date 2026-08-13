import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import {
  AssuranceLevel,
  ExportFormat,
  ExportHistoryResponse,
  SignOffAuditEntryResponse,
  SignOffResponse,
} from './assurance.model';

/** Behind @planGate.check('assurance-workspace') — ISSUER_READY. */
@Injectable({ providedIn: 'root' })
export class AssuranceApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/assurance`;

  all(): Observable<SignOffResponse[]> {
    return this.http.get<SignOffResponse[]>(`${this.base}/signoff`);
  }

  forYear(fiscalYear: number): Observable<SignOffResponse> {
    return this.http.get<SignOffResponse>(`${this.base}/signoff/${fiscalYear}`);
  }

  /** Percentage of the year's data considered complete enough to sign. */
  completion(fiscalYear: number): Observable<{ completionPercent: number }> {
    return this.http.get<{ completionPercent: number }>(`${this.base}/signoff/${fiscalYear}/completion`);
  }

  sign(
    fiscalYear: number,
    body: {
      signerName: string;
      signerTitle: string;
      notes?: string | null;
      assuranceLevel?: AssuranceLevel | null;
      externalAssurerName?: string | null;
      standardReferenced?: string | null;
    },
  ): Observable<SignOffResponse> {
    return this.http.post<SignOffResponse>(`${this.base}/signoff/${fiscalYear}`, body);
  }

  revoke(fiscalYear: number, reason?: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/signoff/${fiscalYear}`, {
      body: { reason: reason ?? null },
    });
  }

  auditTrail(fiscalYear: number): Observable<SignOffAuditEntryResponse[]> {
    return this.http.get<SignOffAuditEntryResponse[]>(`${this.base}/signoff/${fiscalYear}/audit-trail`);
  }
}

/** Behind @planGate.check('reports') — STARTER, so open to every plan. */
@Injectable({ providedIn: 'root' })
export class ExportApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/exports`;

  history(): Observable<ExportHistoryResponse[]> {
    return this.http.get<ExportHistoryResponse[]>(`${this.base}/history`);
  }

  logExport(exportType: string, format: ExportFormat, fiscalYear: number): Observable<void> {
    return this.http.post<void>(`${this.base}/log`, { exportType, format, fiscalYear });
  }

  signOffExport(id: string): Observable<ExportHistoryResponse> {
    return this.http.patch<ExportHistoryResponse>(`${this.base}/history/${id}/sign-off`, {});
  }

  /**
   * Binary endpoints are fetched as blobs so the browser can save them.
   *
   * The PDF reports are GET; `csv` and `csi` are POST on the backend. Getting this wrong
   * surfaces as an opaque 500 rather than a 405, so the verb is driven by the path.
   */
  download(path: string, fiscalYear: number): Observable<Blob> {
    const usesPost = path === 'csv' || path === 'csi';
    const opts = { params: { fiscalYear }, responseType: 'blob' as const };
    return usesPost
      ? this.http.post(`${this.base}/${path}`, null, opts)
      : this.http.get(`${this.base}/${path}`, opts);
  }
}
