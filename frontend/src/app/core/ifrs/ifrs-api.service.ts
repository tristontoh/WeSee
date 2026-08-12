import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import {
  BusinessSegmentResponse,
  IfrsS1DisclosureResponse,
  IfrsS2Response,
  S1ItemResponse,
  UpsertS1ItemRequest,
} from './ifrs.model';

/**
 * Every endpoint sits behind a class-level @planGate.check('ifrs-s1-s2') on the backend, so
 * all of them 403 below ISSUER_READY. The nav hides this screen for lower plans.
 */
@Injectable({ providedIn: 'root' })
export class IfrsApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/ifrs`;

  // --- S1 narrative disclosure ---

  getS1(): Observable<IfrsS1DisclosureResponse> {
    return this.http.get<IfrsS1DisclosureResponse>(`${this.base}/s1/disclosure`);
  }

  updateS1(body: IfrsS1DisclosureResponse): Observable<IfrsS1DisclosureResponse> {
    return this.http.put<IfrsS1DisclosureResponse>(`${this.base}/s1/disclosure`, body);
  }

  // --- S1 business segments and their risks/opportunities ---

  listSegments(): Observable<BusinessSegmentResponse[]> {
    return this.http.get<BusinessSegmentResponse[]>(`${this.base}/s1/segments`);
  }

  createSegment(name: string): Observable<BusinessSegmentResponse> {
    return this.http.post<BusinessSegmentResponse>(`${this.base}/s1/segments`, { name });
  }

  renameSegment(segmentId: string, name: string): Observable<BusinessSegmentResponse> {
    return this.http.put<BusinessSegmentResponse>(`${this.base}/s1/segments/${segmentId}`, { name });
  }

  deleteSegment(segmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/s1/segments/${segmentId}`);
  }

  addItem(segmentId: string, body: UpsertS1ItemRequest): Observable<S1ItemResponse> {
    return this.http.post<S1ItemResponse>(`${this.base}/s1/segments/${segmentId}/items`, body);
  }

  updateItem(itemId: string, body: UpsertS1ItemRequest): Observable<S1ItemResponse> {
    return this.http.put<S1ItemResponse>(`${this.base}/s1/items/${itemId}`, body);
  }

  deleteItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/s1/items/${itemId}`);
  }

  // --- S2 climate disclosure ---

  getS2(): Observable<IfrsS2Response> {
    return this.http.get<IfrsS2Response>(`${this.base}/s2`);
  }

  updateS2(body: IfrsS2Response): Observable<IfrsS2Response> {
    return this.http.put<IfrsS2Response>(`${this.base}/s2`, body);
  }
}
