/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, X, Filter, Archive, Check } from 'lucide-react';
import { tenantAdminApi } from '../../api/tenantAdminApi';
import { planToBackend } from '../../api/mappers';
import { PlanType } from '../../contexts/PlanContext';
import { Tenant, ShowToast, toTenant } from './types';
import { PLAN_PRICING } from './constants';

interface AdminTenantsTabProps {
  tenants: Tenant[];
  tenantsLoading: boolean;
  onSelectTenant: (id: string) => void;
  onTenantUpdated: (updated: Tenant) => void;
  showToast: ShowToast;
}

export default function AdminTenantsTab({ tenants, tenantsLoading, onSelectTenant, onTenantUpdated, showToast }: AdminTenantsTabProps) {
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  const [tenantPlanFilter, setTenantPlanFilter] = useState<'all' | 'starter' | 'growth' | 'issuer-ready'>('all');
  const [tenantStatusFilter, setTenantStatusFilter] = useState<'all' | 'Active' | 'Suspended'>('all');
  const [tenantMarketFilter, setTenantMarketFilter] = useState<'all' | 'SME' | 'Main Market' | 'ACE Market'>('all');

  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [selectedTenantForAction, setSelectedTenantForAction] = useState<Tenant | null>(null);
  const [targetPlanSelection, setTargetPlanSelection] = useState<PlanType>('starter');

  const openChangePlanModal = (tenant: Tenant) => {
    setSelectedTenantForAction(tenant);
    setTargetPlanSelection(tenant.plan);
    setChangePlanModalOpen(true);
  };

  const handleChangePlanConfirm = () => {
    if (!selectedTenantForAction) return;

    tenantAdminApi.updatePlan(selectedTenantForAction.id, planToBackend(targetPlanSelection))
      .then((updated) => {
        onTenantUpdated(toTenant(updated));
        setChangePlanModalOpen(false);
        showToast(`Successfully updated plan tier for "${selectedTenantForAction.name}" to ${targetPlanSelection.toUpperCase()}.`, 'success');
      })
      .catch(() => showToast(`Failed to update plan for "${selectedTenantForAction.name}".`, 'warning'));
  };

  const handleSuspendTenant = (tenant: Tenant) => {
    tenantAdminApi.updateStatus(tenant.id, tenant.status !== 'Active')
      .then((updated) => {
        onTenantUpdated(toTenant(updated));
        showToast(`Billing suspension state toggled for "${tenant.name}".`, 'info');
      })
      .catch(() => showToast(`Failed to update status for "${tenant.name}".`, 'warning'));
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
                          t.contactPerson.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
                          t.contactEmail.toLowerCase().includes(tenantSearchQuery.toLowerCase());
    const matchesPlan = tenantPlanFilter === 'all' || t.plan === tenantPlanFilter;
    const matchesStatus = tenantStatusFilter === 'all' || t.status === tenantStatusFilter;
    const matchesMarket = tenantMarketFilter === 'all' || t.marketClassification === tenantMarketFilter;

    return matchesSearch && matchesPlan && matchesStatus && matchesMarket;
  });

  return (
    <div className="space-y-6">

      {/* Top header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Tenant Directory</h2>
          <p className="text-sm text-gray-500 mt-1">Filter, search, and manage subscriptions for all tenant companies.</p>
        </div>
      </div>

      {/* Filter Bar and Search Input */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants by company name, contact, or email address..."
              value={tenantSearchQuery}
              onChange={(e) => setTenantSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all"
            />
            {tenantSearchQuery && (
              <button onClick={() => setTenantSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters reset */}
          {(tenantPlanFilter !== 'all' || tenantStatusFilter !== 'all' || tenantMarketFilter !== 'all') && (
            <button
              onClick={() => {
                setTenantPlanFilter('all');
                setTenantStatusFilter('all');
                setTenantMarketFilter('all');
                showToast('Cleared active search filters.', 'info');
              }}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 text-xs pt-3 border-t border-gray-100">
          <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wider flex items-center mr-1">
            <Filter className="w-3.5 h-3.5 mr-1" /> Filters:
          </span>

          {/* Plan Filter Row */}
          <div className="flex items-center space-x-1.5 bg-gray-50 p-1 rounded-full border border-gray-100">
            <span className="text-[10px] text-gray-400 px-2 font-bold uppercase">Plan:</span>
            {(['all', 'starter', 'growth', 'issuer-ready'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setTenantPlanFilter(p)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full cursor-pointer transition-all uppercase ${
                  tenantPlanFilter === p
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Status Filter Row */}
          <div className="flex items-center space-x-1.5 bg-gray-50 p-1 rounded-full border border-gray-100">
            <span className="text-[10px] text-gray-400 px-2 font-bold uppercase">Status:</span>
            {(['all', 'Active', 'Suspended'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setTenantStatusFilter(s)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full cursor-pointer transition-all ${
                  tenantStatusFilter === s
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Market Filter Row */}
          <div className="flex items-center space-x-1.5 bg-gray-50 p-1 rounded-full border border-gray-100">
            <span className="text-[10px] text-gray-400 px-2 font-bold uppercase">Market:</span>
            {(['all', 'SME', 'Main Market', 'ACE Market'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTenantMarketFilter(m)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full cursor-pointer transition-all ${
                  tenantMarketFilter === m
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Tenants List Main Table */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Active Plan Tier</th>
                <th className="px-6 py-4">Bursa Category</th>
                <th className="px-6 py-4">Billing Status</th>
                <th className="px-6 py-4">Monthly MRR</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Operator Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {tenantsLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 text-xs font-medium">Loading tenants…</td>
                </tr>
              )}
              {!tenantsLoading && filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 text-xs font-medium">No tenants match the current filters.</td>
                </tr>
              )}
              {filteredTenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Company Profile Column */}
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-extrabold text-xs">
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span onClick={() => onSelectTenant(t.id)} className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors cursor-pointer block">{t.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{t.contactEmail}</span>
                      </div>
                    </div>
                  </td>

                  {/* Plan Tier Badge */}
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      t.plan === 'issuer-ready' ? 'bg-purple-50 text-purple-700' :
                      t.plan === 'growth' ? 'bg-indigo-50 text-indigo-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {t.plan}
                    </span>
                  </td>

                  {/* Bursa classification */}
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-700">{t.marketClassification}</span>
                  </td>

                  {/* Account status */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <span className={`w-1 h-1 rounded-full mr-1.5 ${
                        t.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'
                      }`} />
                      {t.status}
                    </span>
                  </td>

                  {/* Monthly rate */}
                  <td className="px-6 py-4 font-mono font-bold text-gray-700">
                    ${PLAN_PRICING[t.plan]}
                  </td>

                  {/* Date created */}
                  <td className="px-6 py-4 font-mono text-gray-500 text-[11px]">
                    {t.createdDate}
                  </td>

                  {/* Operator row menu */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2.5">
                      <button
                        onClick={() => onSelectTenant(t.id)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        View
                      </button>

                      <button
                        onClick={() => openChangePlanModal(t)}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        Change Plan
                      </button>

                      <button
                        onClick={() => handleSuspendTenant(t)}
                        className="p-1 text-gray-400 hover:text-red-600 cursor-pointer rounded hover:bg-gray-100"
                        title="Toggle Suspension"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CHANGE PLAN */}
      {changePlanModalOpen && selectedTenantForAction && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-100 rounded-[24px] max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-gray-700">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="text-lg font-bold text-gray-900">Modify Tenant Subscription Plan</h4>
              <button onClick={() => setChangePlanModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 cursor-pointer transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Moving <strong className="text-gray-900">"{selectedTenantForAction.name}"</strong> to a different billing tier will instantly update available platform features in their sandbox.
            </p>

            <div className="space-y-3">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Select Active Plan Tier</label>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Starter */}
                <label className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                  targetPlanSelection === 'starter'
                    ? 'bg-emerald-50 border-emerald-500'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}>
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="planSelect"
                      checked={targetPlanSelection === 'starter'}
                      onChange={() => setTargetPlanSelection('starter')}
                      className="text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Starter Plan</span>
                      <span className="text-[10px] text-gray-500">SEDG Core Metrics • $299/mo</span>
                    </div>
                  </div>
                  {targetPlanSelection === 'starter' && <Check className="w-4 h-4 text-emerald-600" />}
                </label>

                {/* Growth */}
                <label className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                  targetPlanSelection === 'growth'
                    ? 'bg-emerald-50 border-emerald-500'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}>
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="planSelect"
                      checked={targetPlanSelection === 'growth'}
                      onChange={() => setTargetPlanSelection('growth')}
                      className="text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Growth Plan</span>
                      <span className="text-[10px] text-gray-500">Board Oversight & Targets • $699/mo</span>
                    </div>
                  </div>
                  {targetPlanSelection === 'growth' && <Check className="w-4 h-4 text-emerald-600" />}
                </label>

                {/* Issuer Ready */}
                <label className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                  targetPlanSelection === 'issuer-ready'
                    ? 'bg-emerald-50 border-emerald-500'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}>
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="planSelect"
                      checked={targetPlanSelection === 'issuer-ready'}
                      onChange={() => setTargetPlanSelection('issuer-ready')}
                      className="text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Issuer-Ready Plan</span>
                      <span className="text-[10px] text-gray-500">Advanced IFRS + Bursa CSI Sync • $1,499/mo</span>
                    </div>
                  </div>
                  {targetPlanSelection === 'issuer-ready' && <Check className="w-4 h-4 text-emerald-600" />}
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setChangePlanModalOpen(false)}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleChangePlanConfirm}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
              >
                Save Subscription Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
