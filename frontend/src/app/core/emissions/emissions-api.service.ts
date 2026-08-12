import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { EmissionsResponse, Scope3CategoryResponse } from './emissions.model';

/**
 * Every endpoint here sits behind a class-level @planGate.check('climate-module') on the
 * backend, so all of them 403 below ISSUER_READY. The nav hides this screen for those plans.
 */
@Injectable({ providedIn: 'root' })
export class EmissionsApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/climate/emissions`;

  get(fiscalYear: number): Observable<EmissionsResponse> {
    return this.http.get<EmissionsResponse>(this.base, { params: { fiscalYear } });
  }

  setScope1(fiscalYear: number, value: number): Observable<EmissionsResponse> {
    return this.http.put<EmissionsResponse>(`${this.base}/scope1/${fiscalYear}`, { value });
  }

  setScope2(fiscalYear: number, value: number): Observable<EmissionsResponse> {
    return this.http.put<EmissionsResponse>(`${this.base}/scope2/${fiscalYear}`, { value });
  }

  setScope3Value(categoryId: string, fiscalYear: number, value: number): Observable<EmissionsResponse> {
    return this.http.put<EmissionsResponse>(
      `${this.base}/scope3/categories/${categoryId}/values/${fiscalYear}`,
      { value },
    );
  }

  addScope3Category(name: string, tooltip?: string): Observable<Scope3CategoryResponse> {
    return this.http.post<Scope3CategoryResponse>(`${this.base}/scope3/categories`, {
      name,
      tooltip: tooltip ?? null,
    });
  }

  deleteScope3Category(categoryId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/scope3/categories/${categoryId}`);
  }
}
