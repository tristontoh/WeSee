/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { PlatformSettingsResponse, UpdatePlatformSettingsRequest } from '../../../api/platformSettingsApi';
import Button from '../../ui/Button';

interface AdminGeneralSettingsTabProps {
  settings: PlatformSettingsResponse;
  saving: boolean;
  onSave: (overrides: Partial<UpdatePlatformSettingsRequest>) => void;
}

export default function AdminGeneralSettingsTab({ settings, saving, onSave }: AdminGeneralSettingsTabProps) {
  const [platformName, setPlatformName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [appBaseUrl, setAppBaseUrl] = useState('');

  useEffect(() => {
    setPlatformName(settings.platformName ?? '');
    setSupportEmail(settings.supportEmail ?? '');
    setAppBaseUrl(settings.appBaseUrl ?? '');
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ platformName, supportEmail, appBaseUrl });
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
      <h3 className="text-lg font-bold text-gray-900">General</h3>
      <p className="text-xs text-gray-500 mt-1 mb-6">Platform identity and the base URL used to build links in system emails.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Platform Name</label>
          <input type="text" value={platformName} onChange={(e) => setPlatformName(e.target.value)} placeholder="WeSee" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Support Email</label>
          <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@wesee.my" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
          <p className="text-[10px] text-gray-400">Shown to tenants as the contact point for platform-level issues.</p>
        </div>
      </div>

      <div className="mb-8 space-y-2">
        <label className="text-xs font-semibold text-gray-700">App Base URL</label>
        <input type="url" value={appBaseUrl} onChange={(e) => setAppBaseUrl(e.target.value)} placeholder="https://app.wesee.my" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
        <p className="text-[10px] text-gray-400">Used to build links in system emails (registration verification, team invites). Leave blank to use the environment default.</p>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" type="submit" loading={saving} icon={<Check className="w-4 h-4" />}>
          Save Settings
        </Button>
      </div>
    </form>
  );
}
