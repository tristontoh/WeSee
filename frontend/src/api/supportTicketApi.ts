/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';

export type TicketType = 'FEEDBACK' | 'SUPPORT_REQUEST';
export type TicketPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TicketStatus = 'OPEN' | 'PENDING' | 'CLOSED';

export interface SupportTicketResponse {
  id: string;
  type: TicketType;
  subject: string;
  message: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  submittedByUserId: string;
  submittedByName: string;
  submittedByEmail: string;
  companyName: string | null;
  note: string | null;
}

export type TicketSenderRole = 'COMPANY_ADMIN' | 'COMPANY_CONTRIBUTOR' | 'CONSULTANT' | 'PLATFORM_ADMIN' | 'SUPERADMIN';

export interface TicketMessageResponse {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: TicketSenderRole;
  message: string;
  createdAt: string;
}

export const supportTicketApi = {
  create: (type: TicketType, subject: string, message: string, priority?: TicketPriority) =>
    apiClient.post<SupportTicketResponse>('/api/v1/support-tickets', { type, subject, message, priority }),

  listMine: () => apiClient.get<SupportTicketResponse[]>('/api/v1/support-tickets'),

  update: (id: string, subject: string, message: string) =>
    apiClient.patch<SupportTicketResponse>(`/api/v1/support-tickets/${id}`, { subject, message }),

  updateNote: (id: string, note: string) =>
    apiClient.patch<SupportTicketResponse>(`/api/v1/support-tickets/${id}/note`, { note }),

  listMessages: (id: string) => apiClient.get<TicketMessageResponse[]>(`/api/v1/support-tickets/${id}/messages`),

  postMessage: (id: string, message: string) =>
    apiClient.post<TicketMessageResponse>(`/api/v1/support-tickets/${id}/messages`, { message }),
};
