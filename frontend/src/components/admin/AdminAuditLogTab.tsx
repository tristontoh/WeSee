/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Search, X, Filter, RefreshCw } from 'lucide-react';
import { activityLogApi, BackendActivityEventType } from '../../api/activityLogApi';
import { ActivityLog, ShowToast, toActivityLog } from './types';
import { useAdminPagination } from './useAdminPagination';
import AdminPagination from './AdminPagination';

const FETCH_LIMIT = 500;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

const EVENT_TYPE_FILTERS: { value: BackendActivityEventType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'SIGNUP', label: 'Signup' },
  { value: 'PLAN_CHANGE', label: 'Plan Change' },
  { value: 'SUPPORT_TICKET', label: 'Support Request' },
  { value: 'EXPORT_SUCCESS', label: 'Sync Success' },
  { value: 'TRIAL_CONVERTED', label: 'Trial Converted' },
  { value: 'TRIAL_REVOKED', label: 'Trial Revoked' },
];

interface AdminAuditLogTabProps {
  onSelectLog: (id: string) => void;
  showToast: ShowToast;
}

export default function AdminAuditLogTab({ onSelectLog, showToast }: AdminAuditLogTabProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<BackendActivityEventType | 'all'>('all');

  const loadLogs = () => {
    setLoading(true);
    activityLogApi.listRecent(FETCH_LIMIT)
      .then((data) => setLogs(data.map(toActivityLog)))
      .catch(() => showToast('Failed to load audit log.', 'warning'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.eventDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = eventTypeFilter === 'all' || EVENT_TYPE_FILTERS.find(f => f.value === eventTypeFilter)?.label === log.eventType;
    return matchesSearch && matchesType;
  });

  const { page, setPage, pageSize, setPageSize, totalPages, pageItems: paginatedLogs } = useAdminPagination<ActivityLog>(filteredLogs, DEFAULT_PAGE_SIZE);

  return (
    <div className="space-y-6">

      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Audit Log</h2>
          <p className="text-sm text-gray-500 mt-1">Full history of signup, plan, support, and export events across all tenant workspaces.</p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar and Search Input */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tenant company or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs pt-3 border-t border-gray-100">
          <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wider flex items-center mr-1">
            <Filter className="w-3.5 h-3.5 mr-1" /> Event Type:
          </span>
          <div className="flex items-center space-x-1.5 bg-gray-50 p-1 rounded-full border border-gray-100">
            {EVENT_TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setEventTypeFilter(f.value)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full cursor-pointer transition-all ${
                  eventTypeFilter === f.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Audit Timestamp</th>
                <th className="px-6 py-4">Tenant Company</th>
                <th className="px-6 py-4">Action Code</th>
                <th className="px-6 py-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400 text-xs font-medium">Loading audit log...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400 text-xs font-medium">
                    {logs.length === 0 ? 'No activity recorded yet.' : 'No events match the current filters.'}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log.id)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono text-[11px] text-gray-500">{log.timestamp}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{log.tenantName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${log.badgeColor}`}>
                        {log.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs leading-relaxed">{log.eventDescription}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredLogs.length > 0 && (
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </div>
  );
}
