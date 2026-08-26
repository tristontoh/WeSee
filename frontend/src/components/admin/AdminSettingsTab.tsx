/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Loader2, Sliders, Mail, ShieldCheck, CreditCard } from 'lucide-react';
import { platformSettingsApi, PlatformSettingsResponse, UpdatePlatformSettingsRequest } from '../../api/platformSettingsApi';
import { ShowToast } from './types';
import AdminGeneralSettingsTab from './settings/AdminGeneralSettingsTab';
import AdminEmailSettingsTab from './settings/AdminEmailSettingsTab';
import AdminSecuritySettingsTab from './settings/AdminSecuritySettingsTab';
import AdminPaymentsSettingsTab from './settings/AdminPaymentsSettingsTab';

interface AdminSettingsTabProps {
  showToast: ShowToast;
}

type SettingsSubTab = 'general' | 'email' | 'security' | 'payments';

const SUB_TABS: { id: SettingsSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'General', icon: Sliders },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'payments', label: 'Payments', icon: CreditCard },
];

export default function AdminSettingsTab({ showToast }: AdminSettingsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('general');
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    platformSettingsApi.get()
      .then(setSettings)
      .catch(() => showToast('Failed to load platform settings.', 'warning'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The backend PUT replaces the whole settings row, so saving from any one sub-tab must resend
  // every field, merging in only what that tab actually changed — otherwise saving Security would
  // silently wipe out whatever's configured on the Email tab, and vice versa.
  const saveSettings = (overrides: Partial<UpdatePlatformSettingsRequest>) => {
    if (!settings) return;
    setSaving(true);
    const request: UpdatePlatformSettingsRequest = {
      smtpHost: settings.smtpHost ?? '',
      smtpPort: settings.smtpPort,
      smtpUsername: settings.smtpUsername ?? '',
      password: '',
      fromAddress: settings.fromAddress ?? '',
      enabled: settings.enabled,
      appBaseUrl: settings.appBaseUrl ?? '',
      platformName: settings.platformName ?? '',
      supportEmail: settings.supportEmail ?? '',
      require2fa: settings.require2fa,
      stripePublishableKey: settings.stripePublishableKey ?? '',
      stripeSecretKey: '',
      stripeWebhookSecret: '',
      stripeEnabled: settings.stripeEnabled,
      ...overrides,
    };
    platformSettingsApi.update(request)
      .then((updated) => {
        setSettings(updated);
        showToast('Platform settings saved.', 'success');
      })
      .catch((err) => showToast(err?.message || 'Failed to save platform settings.', 'warning'))
      .finally(() => setSaving(false));
  };

  if (loading || !settings) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full pb-16">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Platform Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Platform-wide defaults — used across every tenant workspace unless a company configures its own override.</p>
      </div>

      <div className="border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1 min-w-max">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {activeSubTab === 'general' && <AdminGeneralSettingsTab settings={settings} saving={saving} onSave={saveSettings} />}
      {activeSubTab === 'email' && <AdminEmailSettingsTab settings={settings} saving={saving} onSave={saveSettings} onSaved={setSettings} />}
      {activeSubTab === 'security' && <AdminSecuritySettingsTab settings={settings} saving={saving} onSave={saveSettings} />}
      {activeSubTab === 'payments' && <AdminPaymentsSettingsTab settings={settings} saving={saving} onSave={saveSettings} />}
    </div>
  );
}
