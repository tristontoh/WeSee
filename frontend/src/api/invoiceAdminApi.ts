/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
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
