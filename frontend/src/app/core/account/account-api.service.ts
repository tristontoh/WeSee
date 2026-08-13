import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import {
  ApiTokenResponse,
  CreateApiTokenResponse,
  NotificationPreferencesResponse,
  PrivacyConsentResponse,
  SessionResponse,
  SupportTicketResponse,
  TicketMessageResponse,
  TicketPriority,
  TicketType,
  UserProfileResponse,
} from './account.model';

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private http = inject(HttpClient);

  // --- profile ---

  profile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${API_BASE}/users/me`);
  }

  updateProfile(body: {
    name: string;
    phone?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    bio?: string | null;
  }): Observable<UserProfileResponse> {
    return this.http.patch<UserProfileResponse>(`${API_BASE}/users/me`, body);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${API_BASE}/users/me/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  // --- notifications ---

  notifications(): Observable<NotificationPreferencesResponse> {
    return this.http.get<NotificationPreferencesResponse>(`${API_BASE}/users/me/notification-preferences`);
  }

  updateNotifications(body: {
    reportDeadlineReminders: boolean;
    teamActivityAlerts: boolean;
    complianceAlerts: boolean;
    weeklyDigest: boolean;
  }): Observable<NotificationPreferencesResponse> {
    return this.http.patch<NotificationPreferencesResponse>(
      `${API_BASE}/users/me/notification-preferences`,
      body,
    );
  }

  // --- sessions ---

  sessions(): Observable<SessionResponse[]> {
    return this.http.get<SessionResponse[]>(`${API_BASE}/users/me/sessions`);
  }

  revokeSession(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/users/me/sessions/${id}`);
  }

  revokeOtherSessions(): Observable<void> {
    return this.http.post<void>(`${API_BASE}/users/me/sessions/revoke-others`, {});
  }

  // --- API tokens (COMPANY_ADMIN) ---

  apiTokens(): Observable<ApiTokenResponse[]> {
    return this.http.get<ApiTokenResponse[]>(`${API_BASE}/api-tokens`);
  }

  createApiToken(name: string, scopes: string[], expiresInDays?: number): Observable<CreateApiTokenResponse> {
    return this.http.post<CreateApiTokenResponse>(`${API_BASE}/api-tokens`, {
      name,
      scopes,
      expiresInDays: expiresInDays ?? null,
    });
  }

  revokeApiToken(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api-tokens/${id}`);
  }

  // --- privacy (COMPANY_ADMIN) ---

  consent(): Observable<PrivacyConsentResponse> {
    return this.http.get<PrivacyConsentResponse>(`${API_BASE}/privacy/consent`);
  }

  updateConsent(marketingConsent: boolean, analyticsConsent: boolean): Observable<PrivacyConsentResponse> {
    return this.http.patch<PrivacyConsentResponse>(`${API_BASE}/privacy/consent`, {
      marketingConsent,
      analyticsConsent,
    });
  }

  /** Full company data export, for the subject-access-request path. */
  dataExport(): Observable<unknown> {
    return this.http.get<unknown>(`${API_BASE}/privacy/data-export`);
  }

  // --- support tickets (company side) ---

  tickets(): Observable<SupportTicketResponse[]> {
    return this.http.get<SupportTicketResponse[]>(`${API_BASE}/support-tickets`);
  }

  createTicket(
    type: TicketType,
    subject: string,
    message: string,
    priority: TicketPriority,
  ): Observable<SupportTicketResponse> {
    return this.http.post<SupportTicketResponse>(`${API_BASE}/support-tickets`, {
      type,
      subject,
      message,
      priority,
    });
  }

  ticketMessages(id: string): Observable<TicketMessageResponse[]> {
    return this.http.get<TicketMessageResponse[]>(`${API_BASE}/support-tickets/${id}/messages`);
  }

  replyToTicket(id: string, message: string): Observable<TicketMessageResponse> {
    return this.http.post<TicketMessageResponse>(`${API_BASE}/support-tickets/${id}/messages`, { message });
  }
}
