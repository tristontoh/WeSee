import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

/** Base URL of the WeSee FastAPI gateway. Override via a build-time env if deployed. */
export const GATEWAY_URL = 'http://localhost:8000';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  org_type: 'workspace' | 'compliance-hub' | 'admin';
}

export interface EmissionRecord {
  id: string;
  scope: number;
  activity_type: string;
  activity_value: number;
  activity_unit: string;
  tco2e: number;
  factor_source: string;
  factor_dataset_version: string;
  confidence: number;
  ledger_tx_id: string | null;
}

export interface CarbonOverview {
  total_tco2e: number;
  scope1: number;
  scope2: number;
  scope3: number;
  target_progress_pct: number;
  records: EmissionRecord[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /** OAuth2 password flow — the gateway expects form-encoded username/password. */
  login(email: string, password: string): Observable<LoginResponse> {
    const body = new URLSearchParams();
    body.set('username', email);
    body.set('password', password);
    return this.http.post<LoginResponse>(`${GATEWAY_URL}/auth/login`, body.toString(), {
      headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
    });
  }

  /** Live emissions overview for the logged-in org (Engine 01 output). */
  getCarbon(): Observable<CarbonOverview> {
    return this.http.get<CarbonOverview>(`${GATEWAY_URL}/dashboard/carbon`, {
      headers: this.authHeaders(),
    });
  }

  /** Ingest a raw bill (PDF/JPG/PNG) → Engine 01 extracts, gateway certifies + ledgers it.
   * Content-Type is left unset so the browser adds the multipart boundary. */
  ingestBill(file: File): Observable<EmissionRecord> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<EmissionRecord>(`${GATEWAY_URL}/carbon/ingest`, form, {
      headers: this.authHeaders(),
    });
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token()}` });
  }
}
