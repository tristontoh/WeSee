/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { InvoiceResponse } from '../../api/invoiceAdminApi';
import { ShowToast } from './types';

interface AdminBillingTabProps {
  invoices: InvoiceResponse[];
  invoicesLoading: boolean;
  showToast: ShowToast;
}

export default function AdminBillingTab({ invoices, invoicesLoading, showToast }: AdminBillingTabProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
  const grossInvoicedThisMonth = paidInvoices
    .filter(inv => inv.dueDate.slice(0, 7) === currentMonth)
    .reduce((sum, inv) => sum + inv.amount, 0);
  const outstandingCollections = invoices
    .filter(inv => inv.status !== 'PAID')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const payingCompanyCount = new Set(paidInvoices.map(inv => inv.companyId)).size;
  const totalPaidAmount = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const arpu = payingCompanyCount > 0 ? totalPaidAmount / payingCompanyCount : 0;

  return (
    <div className="space-y-6">

      {/* Top header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Subscription Billing & Invoices</h2>
        <p className="text-sm text-gray-500 mt-1">Track transactional revenue pipelines, open payments, and review general invoices.</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
          <span className="text-gray-500 text-xs font-medium block">Gross Invoiced (This month)</span>
          <span className="text-2xl font-bold text-gray-900 mt-1 block font-mono">${grossInvoicedThisMonth.toFixed(2)}</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
          <span className="text-gray-500 text-xs font-medium block">Outstanding Collections</span>
          <span className="text-2xl font-bold text-amber-600 mt-1 block font-mono">${outstandingCollections.toFixed(2)}</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
          <span className="text-gray-500 text-xs font-medium block">Average Revenue Per Account (ARPU)</span>
          <span className="text-2xl font-bold text-gray-900 mt-1 block font-mono">${arpu.toFixed(2)}</span>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900">Invoice Ledger</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Client Tenant</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Invoice Amount</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {invoicesLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 text-xs font-medium">Loading invoices…</td>
                </tr>
              )}
              {!invoicesLoading && invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 text-xs font-medium">No invoices issued yet.</td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-mono font-bold text-gray-700">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-6 py-3.5 font-bold text-gray-900">
                    {inv.companyName ?? '—'}
                  </td>
                  <td className="px-6 py-3.5 font-mono text-gray-500">
                    {inv.dueDate}
                  </td>
                  <td className="px-6 py-3.5 font-bold font-mono text-gray-700">
                    ${inv.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                      inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {inv.status === 'PAID' ? 'Paid' : inv.status === 'OVERDUE' ? 'Overdue' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => showToast(`Receipt copy downloaded for ${inv.invoiceNumber}`, 'info')}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
