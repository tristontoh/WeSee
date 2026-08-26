/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { tenantAdminApi, TenantUserResponse } from '../../api/tenantAdminApi';
import { InvoiceResponse } from '../../api/invoiceAdminApi';
import { Tenant, ShowToast } from './types';
import { PLAN_PRICING, ROLE_LABELS } from './constants';
import { useAdminPagination } from './useAdminPagination';
import AdminPagination from './AdminPagination';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

interface AdminTenantDetailViewProps {
  tenantId: string;
  tenants: Tenant[];
  invoices: InvoiceResponse[];
  invoicesLoading: boolean;
  onBack: () => void;
  showToast: ShowToast;
}

export default function AdminTenantDetailView({ tenantId, tenants, invoices, invoicesLoading, onBack, showToast }: AdminTenantDetailViewProps) {
  const activeTenantDetails = tenants.find(t => t.id === tenantId);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUserResponse[]>([]);
  const [tenantUsersLoading, setTenantUsersLoading] = useState(false);

  useEffect(() => {
    setSelectedUserId(null);
    setTenantUsersLoading(true);
    tenantAdminApi.listUsers(tenantId)
      .then(setTenantUsers)
      .catch(() => showToast('Failed to load tenant users.', 'warning'))
      .finally(() => setTenantUsersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const activeUserDetails = selectedUserId ? tenantUsers.find(u => u.id === selectedUserId) : null;

  const tenantInvoices = invoices.filter(inv => inv.companyId === tenantId);

  const usersPagination = useAdminPagination<TenantUserResponse>(tenantUsers, DEFAULT_PAGE_SIZE);
  const invoicesPagination = useAdminPagination<InvoiceResponse>(tenantInvoices, DEFAULT_PAGE_SIZE);

  if (!activeTenantDetails) {
    return null;
  }

  return (
    <div className="space-y-6">

      {/* Profile Back Navigation Header */}
      <div className="flex items-center">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tenant list directory</span>
        </button>
      </div>

      {/* Profile Info Card */}
      <div>

        {/* General Profile Overview Card */}
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-xl text-gray-700">
                {activeTenantDetails.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{activeTenantDetails.name}</h3>
                <p className="text-xs text-gray-500 mt-1">Tenant ID: <span className="font-mono text-gray-600 font-semibold">{activeTenantDetails.id}</span></p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              activeTenantDetails.plan === 'issuer-ready' ? 'bg-purple-50 text-purple-700' :
              activeTenantDetails.plan === 'growth' ? 'bg-indigo-50 text-indigo-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {activeTenantDetails.plan.toUpperCase()} PLAN
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Market Tier</span>
              <span className="text-xs font-bold text-gray-700 mt-0.5 block">{activeTenantDetails.marketClassification}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Account Status</span>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTenantDetails.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  <span className={`w-1 h-1 rounded-full mr-1.5 ${
                    activeTenantDetails.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                  {activeTenantDetails.status}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Monthly MRR</span>
              <span className="text-xs font-bold text-gray-700 mt-0.5 block font-mono">${PLAN_PRICING[activeTenantDetails.plan]}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Joined Date</span>
              <span className="text-xs font-bold text-gray-700 mt-0.5 block font-mono">{activeTenantDetails.createdDate}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Primary Contact</span>
              <span className="text-xs font-bold text-gray-700 mt-0.5 block">{activeTenantDetails.contactPerson}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Authorized Email</span>
              <span className="text-xs font-bold text-emerald-600 mt-0.5 block font-mono">{activeTenantDetails.contactEmail}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Tenant Team Members */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-6 space-y-4">
        {activeUserDetails ? (
          <div className="space-y-5">
            <button
              onClick={() => setSelectedUserId(null)}
              className="flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Users list</span>
            </button>

            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-lg text-gray-700">
                  {activeUserDetails.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{activeUserDetails.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{activeUserDetails.email}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeUserDetails.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                <span className={`w-1 h-1 rounded-full mr-1.5 ${
                  activeUserDetails.active ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
                {activeUserDetails.active ? 'Active' : 'Suspended'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Role</span>
                <span className="text-xs font-bold text-gray-700 mt-0.5 block">{ROLE_LABELS[activeUserDetails.role]}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Tenant Company</span>
                <span className="text-xs font-bold text-gray-700 mt-0.5 block">{activeTenantDetails?.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Joined</span>
                <span className="text-xs font-bold text-gray-700 mt-0.5 block font-mono">{activeUserDetails.createdAt.slice(0, 10)}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Users</h4>
              <p className="text-xs text-gray-500 mt-1">Workspace members with access to this tenant's data.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-white text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Joined</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {tenantUsersLoading && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-gray-400 text-xs font-medium">Loading users…</td>
                    </tr>
                  )}
                  {!tenantUsersLoading && tenantUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-gray-400 text-xs font-medium">No users found for this tenant.</td>
                    </tr>
                  )}
                  {usersPagination.pageItems.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span onClick={() => setSelectedUserId(u.id)} className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors cursor-pointer block">{u.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">{u.email}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-gray-700">{ROLE_LABELS[u.role]}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          <span className={`w-1 h-1 rounded-full mr-1.5 ${
                            u.active ? 'bg-emerald-500' : 'bg-red-500'
                          }`} />
                          {u.active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-gray-500">
                        {u.createdAt.slice(0, 10)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedUserId(u.id)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!tenantUsersLoading && tenantUsers.length > 0 && (
              <AdminPagination
                page={usersPagination.page}
                totalPages={usersPagination.totalPages}
                totalItems={tenantUsers.length}
                pageSize={usersPagination.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={usersPagination.setPage}
                onPageSizeChange={usersPagination.setPageSize}
                className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100"
              />
            )}
          </>
        )}
      </div>

      {/* Billing History Logs for Specific Tenant */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-gray-900">Billing & Invoicing History</h4>
          <p className="text-xs text-gray-500 mt-1">Audit of monthly invoices issued to this tenant.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-5 py-3">Invoice ID</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Total Amount</th>
                <th className="px-5 py-3">Payment Status</th>
                <th className="px-5 py-3 text-right">Archived copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 text-xs">
              {invoicesLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400 text-xs font-medium">Loading invoices…</td>
                </tr>
              )}
              {!invoicesLoading && invoicesPagination.pageItems.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-500">{inv.dueDate}</td>
                    <td className="px-5 py-3.5 font-bold text-gray-900">${inv.amount.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                        inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {inv.status === 'PAID' ? 'Paid' : inv.status === 'OVERDUE' ? 'Overdue' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => showToast(`Downloading compiled archive of invoice ${inv.invoiceNumber}`, 'info')}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              {!invoicesLoading && tenantInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400 text-xs font-medium">No previous paid subscription transactions registered on trial sandbox.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!invoicesLoading && tenantInvoices.length > 0 && (
          <AdminPagination
            page={invoicesPagination.page}
            totalPages={invoicesPagination.totalPages}
            totalItems={tenantInvoices.length}
            pageSize={invoicesPagination.pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={invoicesPagination.setPage}
            onPageSizeChange={invoicesPagination.setPageSize}
            className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100"
          />
        )}
      </div>

    </div>
  );
}
