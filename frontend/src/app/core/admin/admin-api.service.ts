import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { MarketClassification } from '../company/company.model';
import { SubscriptionPlan } from '../auth/session.model';
import { SupportTicketResponse, TicketStatus } from '../account/account.model';
import { PlanPricingResponse } from '../reference/reference.model';

export interface TenantSummaryResponse {
  id: string;
  name: string;
  sectorCode: string | null;
  marketClassification: MarketClassification | null;
  subscriptionPlan: SubscriptionPlan;
  active: boolean;
  createdAt: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
}

export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  companyId: string;
  companyName: string | null;
  dueDate: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface PlatformSettingsResponse {
  configured: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  fromAddress: string | null;
  enabled: boolean;
  passwordSet: boolean;
  appBaseUrl: string | null;
  platformName: string | null;
  supportEmail: string | null;
}

/** Everything here is PLATFORM_ADMIN or SUPERADMIN only. */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);

  tenants(): Observable<TenantSummaryResponse[]> {
    return this.http.get<TenantSummaryResponse[]>(`${API_BASE}/admin/tenants`);
  }

  setTenantPlan(id: string, plan: SubscriptionPlan): Observable<TenantSummaryResponse> {
    return this.http.patch<TenantSummaryResponse>(`${API_BASE}/admin/tenants/${id}/plan`, { plan });
  }

  setTenantStatus(id: string, active: boolean): Observable<TenantSummaryResponse> {
    return this.http.patch<TenantSummaryResponse>(`${API_BASE}/admin/tenants/${id}/status`, { active });
  }

  invoices(): Observable<InvoiceResponse[]> {
    return this.http.get<InvoiceResponse[]>(`${API_BASE}/admin/invoices`);
  }

  planPricing(): Observable<PlanPricingResponse[]> {
    return this.http.get<PlanPricingResponse[]>(`${API_BASE}/reference/plan-pricing`);
  }

  setPlanPrice(plan: SubscriptionPlan, monthlyPrice: number): Observable<PlanPricingResponse> {
    return this.http.patch<PlanPricingResponse>(`${API_BASE}/admin/plan-pricing/${plan}`, { monthlyPrice });
  }

  settings(): Observable<PlatformSettingsResponse> {
    return this.http.get<PlatformSettingsResponse>(`${API_BASE}/admin/platform-settings`);
  }

  /**
   * `password` is write-only — the backend stores it encrypted and never returns it, so
   * `passwordSet` is the only signal that one exists. Sending null leaves it unchanged.
   */
  updateSettings(body: {
    smtpHost: string | null;
    smtpPort: number;
    smtpUsername: string | null;
    password: string | null;
    fromAddress: string | null;
    enabled: boolean;
    appBaseUrl: string | null;
    platformName: string | null;
    supportEmail: string | null;
    require2fa: boolean;
  }): Observable<PlatformSettingsResponse> {
    return this.http.put<PlatformSettingsResponse>(`${API_BASE}/admin/platform-settings`, body);
  }

  /** Sends a test message to the signed-in admin's own address. */
  sendTestEmail(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${API_BASE}/admin/platform-settings/test`,
      {},
    );
  }

  adminTickets(): Observable<SupportTicketResponse[]> {
    return this.http.get<SupportTicketResponse[]>(`${API_BASE}/admin/support-tickets`);
  }

  setTicketStatus(id: string, status: TicketStatus): Observable<SupportTicketResponse> {
    return this.http.patch<SupportTicketResponse>(`${API_BASE}/admin/support-tickets/${id}/status`, { status });
  }
}
