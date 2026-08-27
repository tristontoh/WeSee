/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';
import { BackendSubscriptionPlan } from './mappers';

export interface CheckoutSessionResponse {
  checkoutUrl: string;
}

export interface ConfirmCheckoutResponse {
  converted: boolean;
  message: string;
}

export interface ChangePlanResponse {
  plan: BackendSubscriptionPlan;
  message: string;
}

export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  companyId: string;
  companyName: string | null;
  dueDate: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  description: string | null;
  createdAt: string;
  /** Stripe's hosted invoice page — null if this row predates link-capture and Stripe isn't reachable to backfill it. */
  hostedInvoiceUrl: string | null;
  /** Direct link to Stripe's generated PDF. */
  pdfUrl: string | null;
}

export interface InvoicePageResponse {
  content: InvoiceResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface NextBillingResponse {
  /** Null if the company has never had an active Stripe subscription. */
  nextBillingDate: string | null;
}

export type CheckoutReturnDestination = 'BILLING' | 'TRIAL_EXPIRED';

/**
 * Self-serve plan management via Stripe — see backend CompanyBillingService. createCheckoutSession
 * is for a company that's never paid before (hosted Checkout, needed to collect a payment method
 * the first time); changePlan is for one that already has an active subscription, and modifies it
 * in place (with proration) rather than creating a second parallel one.
 */
export const billingApi = {
  createCheckoutSession: (targetPlan: BackendSubscriptionPlan, returnTo: CheckoutReturnDestination) =>
    apiClient.post<CheckoutSessionResponse>('/api/v1/company/billing/checkout-session', { targetPlan, returnTo }),

  confirmCheckout: (sessionId: string) =>
    apiClient.post<ConfirmCheckoutResponse>(`/api/v1/company/billing/checkout-session/${sessionId}/confirm`),

  changePlan: (targetPlan: BackendSubscriptionPlan) =>
    apiClient.post<ChangePlanResponse>('/api/v1/company/billing/change-plan', { targetPlan }),

  listInvoices: (page: number, size: number) =>
    apiClient.get<InvoicePageResponse>('/api/v1/company/billing/invoices', { page, size }),

  getNextBillingDate: () => apiClient.get<NextBillingResponse>('/api/v1/company/billing/next-billing'),
};
