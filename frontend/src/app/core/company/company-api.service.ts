import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { Role, SubscriptionPlan } from '../auth/session.model';
import {
  CompanyGroupMemberResponse,
  CompanyResponse,
  CreateTenantUserResponse,
  TeamInviteResponse,
  TenantUserResponse,
  UpdateCompanyProfileRequest,
} from './company.model';

@Injectable({ providedIn: 'root' })
export class CompanyApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/company`;

  get(): Observable<CompanyResponse> {
    return this.http.get<CompanyResponse>(this.base);
  }

  updateProfile(body: UpdateCompanyProfileRequest): Observable<CompanyResponse> {
    return this.http.patch<CompanyResponse>(`${this.base}/profile`, body);
  }

  updatePlan(plan: SubscriptionPlan): Observable<CompanyResponse> {
    return this.http.patch<CompanyResponse>(`${this.base}/plan`, { plan });
  }

  // --- team ---

  listUsers(): Observable<TenantUserResponse[]> {
    return this.http.get<TenantUserResponse[]>(`${this.base}/users`);
  }

  createUser(name: string, email: string, role: Role): Observable<CreateTenantUserResponse> {
    return this.http.post<CreateTenantUserResponse>(`${this.base}/users`, { name, email, role });
  }

  updateUserRole(userId: string, role: Role): Observable<TenantUserResponse> {
    return this.http.patch<TenantUserResponse>(`${this.base}/users/${userId}/role`, { role });
  }

  /** `active` is a query parameter here, not a body field. */
  setUserActive(userId: string, active: boolean): Observable<TenantUserResponse> {
    return this.http.patch<TenantUserResponse>(`${this.base}/users/${userId}/active`, null, {
      params: { active },
    });
  }

  // --- invites ---

  listInvites(): Observable<TeamInviteResponse[]> {
    return this.http.get<TeamInviteResponse[]>(`${this.base}/invites`);
  }

  createInvite(name: string, email: string, role: Role): Observable<TeamInviteResponse> {
    return this.http.post<TeamInviteResponse>(`${this.base}/invites`, { name, email, role });
  }

  resendInvite(inviteId: string): Observable<TeamInviteResponse> {
    return this.http.post<TeamInviteResponse>(`${this.base}/invites/${inviteId}/resend`, {});
  }

  revokeInvite(inviteId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/invites/${inviteId}`);
  }

  // --- group ---

  group(): Observable<CompanyGroupMemberResponse[]> {
    return this.http.get<CompanyGroupMemberResponse[]>(`${this.base}/group`);
  }

  createSubsidiary(name: string): Observable<CompanyGroupMemberResponse> {
    return this.http.post<CompanyGroupMemberResponse>(`${this.base}/subsidiaries`, { name });
  }

  deleteSubsidiary(companyId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/subsidiaries/${companyId}`);
  }

  /**
   * Reassigns the caller's company server-side. No new token is issued and none is needed —
   * JwtAuthenticationFilter resolves the company from the database on every request, so the
   * switch takes effect immediately. The caller must still refresh the session via /auth/me
   * because the cached MeResponse (including plan, which drives nav) is now stale.
   */
  switchTo(companyId: string): Observable<CompanyGroupMemberResponse> {
    return this.http.post<CompanyGroupMemberResponse>(`${this.base}/switch/${companyId}`, {});
  }
}
