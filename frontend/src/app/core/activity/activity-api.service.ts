import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { EmissionActivityEntryResponse, EmissionFactorResponse, EmissionScope } from './activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/climate/activity`;

  factors(): Observable<EmissionFactorResponse[]> {
    return this.http.get<EmissionFactorResponse[]>(`${this.base}/factors`);
  }

  entries(fiscalYear: number): Observable<EmissionActivityEntryResponse[]> {
    return this.http.get<EmissionActivityEntryResponse[]>(`${this.base}/entries`, {
      params: { fiscalYear },
    });
  }

  addEntry(
    fiscalYear: number,
    factorId: string,
    quantity: number,
  ): Observable<EmissionActivityEntryResponse> {
    return this.http.post<EmissionActivityEntryResponse>(`${this.base}/entries`, {
      fiscalYear,
      factorId,
      quantity,
    });
  }

  deleteEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/entries/${id}`);
  }

  /**
   * Writes the year's entries into scope totals. Succeeds on STARTER, but the resulting totals
   * are only readable via GET /climate/emissions, which is ISSUER_READY-only — so the caller
   * confirms what was applied rather than reading it back. The response is EmissionsResponse,
   * typed as unknown here because M3a never renders it.
   */
  applyToScope(fiscalYear: number, scope: EmissionScope): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/entries/apply`, null, {
      params: { fiscalYear, scope },
    });
  }
}
