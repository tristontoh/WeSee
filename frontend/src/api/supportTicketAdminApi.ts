/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';
import { SupportTicketResponse, TicketStatus, TicketMessageResponse } from './supportTicketApi';

export const supportTicketAdminApi = {
  listAll: () => apiClient.get<SupportTicketResponse[]>('/api/v1/admin/support-tickets'),

  updateStatus: (id: string, status: TicketStatus) =>
    apiClient.patch<SupportTicketResponse>(`/api/v1/admin/support-tickets/${id}/status`, { status }),

  updateNote: (id: string, note: string) =>
    apiClient.patch<SupportTicketResponse>(`/api/v1/admin/support-tickets/${id}/note`, { note }),

  listMessages: (id: string) => apiClient.get<TicketMessageResponse[]>(`/api/v1/admin/support-tickets/${id}/messages`),

  postMessage: (id: string, message: string) =>
    apiClient.post<TicketMessageResponse>(`/api/v1/admin/support-tickets/${id}/messages`, { message }),
};
