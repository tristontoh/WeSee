/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { Check, AlertCircle, Eye, EyeOff, Send, Sparkles } from 'lucide-react';
import { platformSettingsApi, PlatformSettingsResponse, UpdatePlatformSettingsRequest } from '../../../api/platformSettingsApi';
import { useToast } from '../../../contexts/ToastContext';
import Button from '../../ui/Button';

interface AdminEmailSettingsTabProps {
  settings: PlatformSettingsResponse;
  saving: boolean;
  onSave: (overrides: Partial<UpdatePlatformSettingsRequest>) => void;
  onSaved: (settings: PlatformSettingsResponse) => void;
}

export default function AdminEmailSettingsTab({ settings, saving, onSave, onSaved }: AdminEmailSettingsTabProps) {
  const { showToast } = useToast();
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fromAddress, setFromAddress] = useState('');
  const [enabled, setEnabled] = useState(false);

  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setSmtpHost(settings.smtpHost ?? '');
    setSmtpPort(settings.smtpPort ?? 587);
    setSmtpUsername(settings.smtpUsername ?? '');
    setFromAddress(settings.fromAddress ?? '');
    setEnabled(settings.enabled);
    setPassword('');
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ smtpHost, smtpPort, smtpUsername, password, fromAddress, enabled });
  };

  const handleTest = () => {
    setTesting(true);
    platformSettingsApi.sendTest()
      .then((result) => {
        showToast(result.message, result.success ? 'success' : 'error');
        return platformSettingsApi.get();
      })
      .then(onSaved)
      .catch((err) => showToast(err?.message || 'Failed to send test email.', 'error'))
      .finally(() => setTesting(false));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <form onSubmit={handleSave} className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg font-bold text-gray-900">Default Outbound Email (SMTP)</h3>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Used to send system emails (registration verification, team invites) for any tenant that hasn't configured their own SMTP. If disabled, the environment-configured default is used instead.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-gray-700">SMTP Host</label>
            <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.sendgrid.net" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Port</label>
            <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(parseInt(e.target.value, 10) || 587)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Username</label>
            <input type="text" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="apikey" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Password {settings.passwordSet && <span className="text-gray-400 font-normal">(leave blank to keep existing)</span>}</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={settings.passwordSet ? '••••••••' : ''} className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <label className="text-xs font-semibold text-gray-700">From address</label>
          <input type="email" value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="no-reply@wesee.my" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
        </div>

        <label className="flex items-center gap-2.5 mb-8 cursor-pointer w-fit">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
          <span className="text-xs font-semibold text-gray-700">Enabled — use these settings as the platform default sender</span>
        </label>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={handleTest} loading={testing} disabled={!settings.configured} icon={<Send className="w-4 h-4" />}>
            Send Test Email
          </Button>
          <Button variant="primary" type="submit" loading={saving} icon={<Check className="w-4 h-4" />}>
            Save Settings
          </Button>
        </div>
      </form>

      <div className="w-full lg:w-80 flex flex-col space-y-4 shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Status</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Configuration</span>
              {settings.configured ? (
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wider">Configured</span>
              ) : (
                <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 uppercase tracking-wider">Not Configured</span>
              )}
            </div>
            {settings.configured && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">State</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                  settings.enabled ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-gray-500 bg-gray-100 border-gray-200'
                }`}>{settings.enabled ? 'Active' : 'Disabled'}</span>
              </div>
            )}
            {settings.lastTestAt && (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Last test</span>
                  <span className="text-gray-900 font-bold">{new Date(settings.lastTestAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Result</span>
                  {settings.lastTestSuccess ? (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wider">Success</span>
                  ) : (
                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 uppercase tracking-wider">Failed</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TIP</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed font-medium">
            This only affects tenants without their own SMTP configured — per-company overrides always take priority.
          </p>
        </div>
      </div>
    </div>
  );
}
