import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { ExtractedDocumentResponse, ExtractedRecordResponse } from './extraction.model';

@Injectable({ providedIn: 'root' })
export class ExtractionApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/extraction`;

  list(): Observable<ExtractedDocumentResponse[]> {
    return this.http.get<ExtractedDocumentResponse[]>(`${this.base}/documents`);
  }

  get(id: string): Observable<ExtractedDocumentResponse> {
    return this.http.get<ExtractedDocumentResponse>(`${this.base}/documents/${id}`);
  }

  /**
   * The stored document itself, for the detail screen's preview.
   *
   * Fetched as a blob rather than pointed at with `<img src>` or `<iframe src>`: those cannot
   * carry the Authorization header, and the endpoint is tenant-scoped. The caller turns this into
   * an object URL — and must revoke it, or every visit leaks one.
   */
  file(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/documents/${id}/file`, { responseType: 'blob' });
  }

  upload(file: File): Observable<ExtractedDocumentResponse> {
    const form = new FormData();
    form.append('file', file);
    // Content-Type is left unset so the browser adds the multipart boundary.
    return this.http.post<ExtractedDocumentResponse>(`${this.base}/documents`, form);
  }

  retry(id: string): Observable<ExtractedDocumentResponse> {
    return this.http.post<ExtractedDocumentResponse>(`${this.base}/documents/${id}/retry`, {});
  }

  accept(
    recordId: string,
    body: { value?: number; fiscalYear?: number; month?: number },
  ): Observable<ExtractedRecordResponse> {
    return this.http.post<ExtractedRecordResponse>(`${this.base}/records/${recordId}/accept`, body);
  }

  reject(recordId: string): Observable<ExtractedRecordResponse> {
    return this.http.post<ExtractedRecordResponse>(`${this.base}/records/${recordId}/reject`, {});
  }
}
