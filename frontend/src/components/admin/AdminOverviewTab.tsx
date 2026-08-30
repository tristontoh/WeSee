/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { Building2, CreditCard, UserPlus } from 'lucide-react';
import Card from '../ui/Card';
import { activityLogApi } from '../../api/activityLogApi';
import { CAPABILITIES } from '../../capabilities';
import { Tenant, ActivityLog, ShowToast, toActivityLog } from './types';
import { PLAN_PRICING } from './constants';
import { useAdminPagination } from './useAdminPagination';
import AdminPagination from './AdminPagination';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const FETCH_LIMIT = 100;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

interface AdminOverviewTabProps {
  tenants: Tenant[];
  showToast: ShowToast;
}

export default function AdminOverviewTab({ tenants, showToast }: AdminOverviewTabProps) {
  const totalTenants = tenants.length;
  const mrrTotal = tenants.reduce((acc, curr) => acc + (curr.status === 'Active' ? PLAN_PRICING[curr.plan] : 0), 0);
  const starterCount = tenants.filter(t => t.plan === 'starter').length;
  const growthCount = tenants.filter(t => t.plan === 'growth').length;
  const issuerCount = tenants.filter(t => t.plan === 'issuer-ready').length;

  const newTenantsLast30Days = tenants.filter(t => Date.now() - new Date(t.createdDate).getTime() <= THIRTY_DAYS_MS).length;

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(true);

  useEffect(() => {
    if (!CAPABILITIES.activityLog) {
      setActivityLogsLoading(false);
      return;
    }
    activityLogApi.listRecent(FETCH_LIMIT)
      .then((data) => setActivityLogs(data.map(toActivityLog)))
      .catch(() => showToast('Failed to load recent activity.', 'warning'))
      .finally(() => setActivityLogsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems: paginatedLogs } = useAdminPagination<ActivityLog>(activityLogs, DEFAULT_PAGE_SIZE);

  return (
    <div className="space-y-6">

      {/* Top Header Row */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Platform Overview</h2>
        <p className="text-sm text-gray-500 mt-1">Real-time stats and audit-trail logs across all tenant workspaces.</p>
      </div>

      {/* Top Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Stat card 1 */}
        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-1">Total Registered Tenants</p>
              <h3 className="text-gray-900 text-2xl font-bold">{totalTenants}</h3>
            </div>
          </div>
        </div>

        {/* Stat card 2 */}
        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-1">Active Monthly Revenue</p>
              <h3 className="text-gray-900 text-2xl font-bold font-mono">${mrrTotal.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        {/* Stat card 3: Horizontal Plan Breakdown Bar */}
        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-medium">Tenants by Plan Tier</span>
            <span className="text-[10px] font-bold text-gray-400 font-mono">{starterCount}S / {growthCount}G / {issuerCount}I</span>
          </div>

          {/* Bar Visualizer */}
          <div className="h-3 rounded-full overflow-hidden flex w-full bg-gray-100">
            <div style={{ width: `${(starterCount / totalTenants) * 100}%` }} className="bg-gray-400 h-full" title="Starter Plan" />
            <div style={{ width: `${(growthCount / totalTenants) * 100}%` }} className="bg-indigo-500 h-full" title="Growth Plan" />
            <div style={{ width: `${(issuerCount / totalTenants) * 100}%` }} className="bg-purple-500 h-full" title="Issuer-Ready Plan" />
          </div>

          {/* Small Legend */}
          <div className="flex justify-between text-[10px] font-semibold text-gray-500 pt-1">
            <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1" />Starter</span>
            <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1" />Growth</span>
            <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1" />Issuer</span>
          </div>
        </div>

        {/* Stat card 4 */}
        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-1">New Tenants (30d)</p>
              <h3 className="text-gray-900 text-2xl font-bold font-mono">{newTenantsLast30Days}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Auditing Log Table — omitted entirely rather than shown permanently empty
          where the backend serves no activity log. See capabilities.ts. */}
      {CAPABILITIES.activityLog && (
      <Card className="bg-white text-slate-900 border border-slate-100 overflow-hidden shadow-2xl" padded="none">
        <div className="px-6 py-5 border-b border-navy-50 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-navy-950">System-Wide Security & Lifecycle Audits</h4>
            <p className="text-xs text-navy-400 mt-0.5">Real-time capture of compliance milestones, plan upgrades, and key user actions.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-navy-500 text-[10px] uppercase font-bold tracking-wider font-mono">
                <th className="px-6 py-3.5">Audit Timestamp</th>
                <th className="px-6 py-3.5">Tenant Company</th>
                <th className="px-6 py-3.5">Action Code</th>
                <th className="px-6 py-3.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50 text-navy-700 font-medium">
              {activityLogsLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-navy-400 text-xs">Loading recent activity...</td>
                </tr>
              ) : activityLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-navy-400 text-xs">No activity recorded yet.</td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-navy-50/45 transition-colors">
                    <td className="px-6 py-4 font-mono text-[11px] text-navy-500">{log.timestamp}</td>
                    <td className="px-6 py-4 font-bold text-navy-950">{log.tenantName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${log.badgeColor}`}>
                        {log.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-navy-600 text-xs leading-relaxed">{log.eventDescription}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!activityLogsLoading && activityLogs.length > 0 && (
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalItems={activityLogs.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </Card>
      )}

    </div>
  );
}
