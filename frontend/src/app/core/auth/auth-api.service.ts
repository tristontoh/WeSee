import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { AuthResponse, InvitePreviewResponse, LoginResponse, MeResponse } from './session.model';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  companyName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private http = inject(HttpClient);

  /** JSON, not form-encoded — the old FastAPI gateway's OAuth2 password flow is gone. */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE}/auth/login`, { email, password });
  }

  verifyMfa(mfaToken: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE}/auth/login/verify-mfa`, { mfaToken, code });
  }

  register(body: RegisterRequest): Observable<{ email: string }> {
    return this.http.post<{ email: string }>(`${API_BASE}/auth/register`, body);
  }

  /** Returns 204 No Content on success. */
  verifyEmail(token: string): Observable<void> {
    return this.http.post<void>(`${API_BASE}/auth/verify-email`, { token });
  }

  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_BASE}/auth/resend-verification`, { email });
  }

  /** Rehydrates a session after a page reload, when only the stored token survives. */
  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${API_BASE}/auth/me`);
  }

  /** Reads an invite without consuming it, so the landing page can show who it is for. */
  previewInvite(token: string): Observable<InvitePreviewResponse> {
    return this.http.get<InvitePreviewResponse>(`${API_BASE}/auth/invites/${token}`);
  }

  /** Consumes the invite and signs the new member in. */
  acceptInvite(token: string, name: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE}/auth/invites/${token}/accept`, { name, password });
  }

  /** Returns a fresh MeResponse; the session should be updated from it. */
  completeOnboarding(body: {
    market: string;
    sectorCode: string | null;
    frameworks: string[];
    priorities: string[];
  }): Observable<MeResponse> {
    return this.http.patch<MeResponse>(`${API_BASE}/auth/onboarding`, body);
  }
}
