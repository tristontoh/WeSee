/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { Check, Clock, ShieldCheck } from 'lucide-react';
import { PlatformSettingsResponse, UpdatePlatformSettingsRequest } from '../../../api/platformSettingsApi';
import Button from '../../ui/Button';

interface AdminSecuritySettingsTabProps {
  settings: PlatformSettingsResponse;
  saving: boolean;
  onSave: (overrides: Partial<UpdatePlatformSettingsRequest>) => void;
}

function formatDuration(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes / 1440 === 1 ? '' : 's'}`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes / 60 === 1 ? '' : 's'}`;
  return `${minutes} minutes`;
}

export default function AdminSecuritySettingsTab({ settings, saving, onSave }: AdminSecuritySettingsTabProps) {
  const [require2fa, setRequire2fa] = useState(false);

  useEffect(() => {
    setRequire2fa(settings.require2fa);
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ require2fa });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <form onSubmit={handleSave} className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg font-bold text-gray-900">Security</h3>
        <p className="text-xs text-gray-500 mt-1 mb-6">Platform-wide authentication policy.</p>

        <div className="mb-8 border border-gray-100 rounded-xl p-5 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-900">Session Length</span>
          </div>
          <p className="text-sm text-gray-700 font-semibold">{formatDuration(settings.sessionExpirationMinutes)}</p>
          <p className="text-[10px] text-gray-400 mt-1">How long a login session stays valid before requiring sign-in again. Set via server configuration — not editable here.</p>
        </div>

        <label className="flex items-start gap-3 mb-8 cursor-pointer">
          <input
            type="checkbox"
            checked={require2fa}
            onChange={(e) => setRequire2fa(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
          />
          <span>
            <span className="text-xs font-semibold text-gray-700 block">Require two-factor authentication for all users</span>
            <span className="text-[10px] text-gray-500 block mt-1">
              Users without 2FA enabled will be redirected to their Profile page to set it up before they can use the rest of the app. Applies to every role, including platform admins.
            </span>
          </span>
        </label>

        <div className="flex justify-end">
          <Button variant="primary" type="submit" loading={saving} icon={<Check className="w-4 h-4" />}>
            Save Settings
          </Button>
        </div>
      </form>

      <div className="w-full lg:w-80 flex flex-col space-y-4 shrink-0">
        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HOW ENFORCEMENT WORKS</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed font-medium">
            Enrollment requires a working session, so this can't block sign-in outright. Instead, any user without 2FA is confined to their Profile page (where the 2FA card lives) until they enroll.
          </p>
        </div>
      </div>
    </div>
  );
}
