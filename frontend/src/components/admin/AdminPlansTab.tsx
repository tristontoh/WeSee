/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { planAdminApi, PlanPricingResponse } from '../../api/planAdminApi';
import { FeatureFlagResponse } from '../../api/referenceApi';
import { BackendSubscriptionPlan } from '../../api/mappers';
import { ShowToast } from './types';
import { PLAN_ORDER, PLAN_LABELS, PLAN_BADGE_CLASSES, FEATURE_LABELS } from './constants';
import Select from '../ui/Select';

interface AdminPlansTabProps {
  showToast: ShowToast;
}

export default function AdminPlansTab({ showToast }: AdminPlansTabProps) {
  const [planPricing, setPlanPricing] = useState<PlanPricingResponse[]>([]);
  const [planPricingLoading, setPlanPricingLoading] = useState(true);
  const [editingPricePlan, setEditingPricePlan] = useState<BackendSubscriptionPlan | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [annualPriceDraft, setAnnualPriceDraft] = useState('');

  const [featureFlagsAdmin, setFeatureFlagsAdmin] = useState<FeatureFlagResponse[]>([]);
  const [featureFlagsAdminLoading, setFeatureFlagsAdminLoading] = useState(true);

  useEffect(() => {
    planAdminApi.listPricing()
      .then(setPlanPricing)
      .catch(() => showToast('Failed to load plan pricing.', 'warning'))
      .finally(() => setPlanPricingLoading(false));

    planAdminApi.listFeatureFlags()
      .then(setFeatureFlagsAdmin)
      .catch(() => showToast('Failed to load feature flags.', 'warning'))
      .finally(() => setFeatureFlagsAdminLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEditPrice = (plan: BackendSubscriptionPlan, currentMonthly: number, currentAnnual: number) => {
    setEditingPricePlan(plan);
    setPriceDraft(String(currentMonthly));
    setAnnualPriceDraft(String(currentAnnual));
  };

  const savePrice = (plan: BackendSubscriptionPlan) => {
    const monthly = parseFloat(priceDraft);
    const annual = parseFloat(annualPriceDraft);
    if (Number.isNaN(monthly) || monthly < 0 || Number.isNaN(annual) || annual < 0) {
      showToast('Enter valid prices.', 'warning');
      return;
    }
    planAdminApi.updatePricing(plan, monthly, annual)
      .then((updated) => {
        setPlanPricing(prev => prev.map(p => p.plan === updated.plan ? updated : p));
        setEditingPricePlan(null);
        showToast(`Updated ${PLAN_LABELS[plan]} pricing — $${monthly}/mo monthly, $${annual}/mo billed annually.`, 'success');
      })
      .catch(() => showToast('Failed to update pricing.', 'warning'));
  };

  const updateFeatureMinPlan = (featureKey: string, minPlan: BackendSubscriptionPlan) => {
    const flag = featureFlagsAdmin.find(f => f.featureKey === featureKey);
    if (!flag) return;
    planAdminApi.updateFeatureFlag(featureKey, minPlan, flag.visibleOnlyAtMinPlan)
      .then((updated) => {
        setFeatureFlagsAdmin(prev => prev.map(f => f.featureKey === updated.featureKey ? updated : f));
        showToast(`Updated minimum plan for "${FEATURE_LABELS[featureKey]?.name ?? featureKey}".`, 'success');
      })
      .catch(() => showToast('Failed to update feature.', 'warning'));
  };

  const toggleFeatureVisibility = (featureKey: string) => {
    const flag = featureFlagsAdmin.find(f => f.featureKey === featureKey);
    if (!flag) return;
    planAdminApi.updateFeatureFlag(featureKey, flag.minPlan, !flag.visibleOnlyAtMinPlan)
      .then((updated) => {
        setFeatureFlagsAdmin(prev => prev.map(f => f.featureKey === updated.featureKey ? updated : f));
        showToast(`Updated visibility for "${FEATURE_LABELS[featureKey]?.name ?? featureKey}".`, 'success');
      })
      .catch(() => showToast('Failed to update feature.', 'warning'));
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Plan Management</h2>
        <p className="text-sm text-gray-500 mt-1">Set monthly pricing and control which features are included at each plan tier.</p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {planPricingLoading && (
          <div className="col-span-3 text-center py-8 text-gray-400 text-xs font-medium bg-white rounded-[20px] border border-gray-100">Loading pricing…</div>
        )}
        {!planPricingLoading && PLAN_ORDER.map((plan) => {
          const pricing = planPricing.find(p => p.plan === plan);
          const isEditing = editingPricePlan === plan;
          return (
            <div key={plan} className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${PLAN_BADGE_CLASSES[plan]}`}>
                {PLAN_LABELS[plan]}
              </span>

              {isEditing ? (
                <div className="mt-3 space-y-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Monthly</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={priceDraft}
                        onChange={(e) => setPriceDraft(e.target.value)}
                        autoFocus
                        className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-lg font-bold text-gray-900 font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Billed annually (per mo)</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={annualPriceDraft}
                        onChange={(e) => setAnnualPriceDraft(e.target.value)}
                        className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-lg font-bold text-gray-900 font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => savePrice(plan)}
                      className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingPricePlan(null)}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg cursor-pointer transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-bold text-gray-900 font-mono">${pricing?.monthlyPrice ?? '—'}</span>
                      <span className="text-xs text-gray-400">/mo</span>
                    </div>
                    <div className="text-[10px] text-gray-400">${pricing?.annualMonthlyPrice ?? '—'}/mo billed annually</div>
                  </div>
                  <button
                    onClick={() => startEditPrice(plan, pricing?.monthlyPrice ?? 0, pricing?.annualMonthlyPrice ?? 0)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    title="Edit price"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature gating table */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="text-sm font-bold text-gray-900">Feature Gating</h4>
          <p className="text-xs text-gray-500 mt-0.5">Changes take effect immediately for every tenant workspace.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Feature</th>
                <th className="px-6 py-4">Minimum Plan</th>
                <th className="px-6 py-4">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {featureFlagsAdminLoading && (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-400 text-xs font-medium">Loading features…</td>
                </tr>
              )}
              {!featureFlagsAdminLoading && featureFlagsAdmin.map((flag) => {
                const label = FEATURE_LABELS[flag.featureKey];
                return (
                  <tr key={flag.featureKey} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-gray-900 block">{label?.name ?? flag.featureKey}</span>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">{label?.description}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <Select
                        size="sm"
                        className="w-[150px]"
                        aria-label="Minimum plan"
                        value={flag.minPlan}
                        onChange={(v) => updateFeatureMinPlan(flag.featureKey, v as BackendSubscriptionPlan)}
                        options={PLAN_ORDER.map((p) => ({ value: p, label: PLAN_LABELS[p] }))}
                      />
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => toggleFeatureVisibility(flag.featureKey)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          flag.visibleOnlyAtMinPlan
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Click to toggle"
                      >
                        {flag.visibleOnlyAtMinPlan ? 'Hidden until unlocked' : 'Always visible'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
