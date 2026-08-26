/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';

export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  companyId: string;
  companyName: string | null;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
  createdAt: string;
}

export const invoiceAdminApi = {
  listAll: () => apiClient.get<InvoiceResponse[]>('/api/v1/admin/invoices'),
};
