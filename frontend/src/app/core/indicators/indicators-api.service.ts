import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { AuditEntryDto, IndicatorResponse, TargetDirection } from './indicators.model';

@Injectable({ providedIn: 'root' })
export class IndicatorsApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/indicators`;

  list(): Observable<IndicatorResponse[]> {
    return this.http.get<IndicatorResponse[]>(this.base);
  }

  get(indicatorId: string): Observable<IndicatorResponse> {
    return this.http.get<IndicatorResponse>(`${this.base}/${indicatorId}`);
  }

  /** DIRECT_ANNUAL indicators only — others return 409. */
  setAnnualValue(
    indicatorId: string,
    fiscalYear: number,
    value: number,
    sourceDocName?: string,
    comment?: string,
  ): Observable<IndicatorResponse> {
    return this.http.patch<IndicatorResponse>(`${this.base}/${indicatorId}/values/${fiscalYear}`, {
      value,
      sourceDocName: sourceDocName ?? null,
      comment: comment ?? null,
    });
  }

  /** Computed indicators only — DIRECT_ANNUAL returns 409. */
  setMonthlyValue(
    indicatorId: string,
    fiscalYear: number,
    month: number,
    value: number,
    sourceDocName?: string,
    comment?: string,
  ): Observable<IndicatorResponse> {
    return this.http.patch<IndicatorResponse>(
      `${this.base}/${indicatorId}/monthly/${fiscalYear}/${month}`,
      { value, sourceDocName: sourceDocName ?? null, comment: comment ?? null },
    );
  }

  setTarget(
    indicatorId: string,
    target: number,
    targetDirection: TargetDirection,
  ): Observable<IndicatorResponse> {
    return this.http.patch<IndicatorResponse>(`${this.base}/${indicatorId}/target`, {
      target,
      targetDirection,
    });
  }

  /** COMPANY_ADMIN only. */
  approve(indicatorId: string, fiscalYear: number): Observable<IndicatorResponse> {
    return this.http.patch<IndicatorResponse>(
      `${this.base}/${indicatorId}/values/${fiscalYear}/approve`,
      {},
    );
  }

  uploadEvidence(auditEntryId: string, file: File): Observable<AuditEntryDto> {
    const form = new FormData();
    form.append('file', file);
    // Content-Type is left unset so the browser adds the multipart boundary.
    return this.http.post<AuditEntryDto>(`${this.base}/audit-entries/${auditEntryId}/evidence`, form);
  }

  evidenceUrl(auditEntryId: string): string {
    return `${this.base}/audit-entries/${auditEntryId}/evidence`;
  }
}
