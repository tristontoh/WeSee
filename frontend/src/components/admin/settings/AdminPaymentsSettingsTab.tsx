/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Sparkles } from 'lucide-react';
import { PlatformSettingsResponse, UpdatePlatformSettingsRequest } from '../../../api/platformSettingsApi';
import Button from '../../ui/Button';

interface AdminPaymentsSettingsTabProps {
  settings: PlatformSettingsResponse;
  saving: boolean;
  onSave: (overrides: Partial<UpdatePlatformSettingsRequest>) => void;
}

export default function AdminPaymentsSettingsTab({ settings, saving, onSave }: AdminPaymentsSettingsTabProps) {
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  useEffect(() => {
    setStripePublishableKey(settings.stripePublishableKey ?? '');
    setStripeEnabled(settings.stripeEnabled);
    setStripeSecretKey('');
    setStripeWebhookSecret('');
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ stripePublishableKey, stripeSecretKey, stripeWebhookSecret, stripeEnabled });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <form onSubmit={handleSave} className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg font-bold text-gray-900">Stripe</h3>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          API keys used to process subscription billing and invoicing across the platform.
        </p>

        <div className="mb-6 space-y-2">
          <label className="text-xs font-semibold text-gray-700">Publishable Key</label>
          <input type="text" value={stripePublishableKey} onChange={(e) => setStripePublishableKey(e.target.value)} placeholder="pk_live_..." className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Secret Key {settings.stripeSecretKeySet && <span className="text-gray-400 font-normal">(leave blank to keep existing)</span>}</label>
            <div className="relative">
              <input type={showSecretKey ? 'text' : 'password'} value={stripeSecretKey} onChange={(e) => setStripeSecretKey(e.target.value)} placeholder={settings.stripeSecretKeySet ? '••••••••' : 'sk_live_...'} className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
              <button type="button" onClick={() => setShowSecretKey(!showSecretKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Webhook Secret {settings.stripeWebhookSecretSet && <span className="text-gray-400 font-normal">(leave blank to keep existing)</span>}</label>
            <div className="relative">
              <input type={showWebhookSecret ? 'text' : 'password'} value={stripeWebhookSecret} onChange={(e) => setStripeWebhookSecret(e.target.value)} placeholder={settings.stripeWebhookSecretSet ? '••••••••' : 'whsec_...'} className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
              <button type="button" onClick={() => setShowWebhookSecret(!showWebhookSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2.5 mb-8 cursor-pointer w-fit">
          <input type="checkbox" checked={stripeEnabled} onChange={(e) => setStripeEnabled(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
          <span className="text-xs font-semibold text-gray-700">Enabled — use these keys for subscription billing</span>
        </label>

        <div className="flex justify-end">
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
              {settings.stripeSecretKeySet ? (
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wider">Configured</span>
              ) : (
                <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 uppercase tracking-wider">Not Configured</span>
              )}
            </div>
            {settings.stripeSecretKeySet && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">State</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                  settings.stripeEnabled ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-gray-500 bg-gray-100 border-gray-200'
                }`}>{settings.stripeEnabled ? 'Active' : 'Disabled'}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Webhook</span>
              {settings.stripeWebhookSecretSet ? (
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wider">Set</span>
              ) : (
                <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 uppercase tracking-wider">Not Set</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TIP</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed font-medium">
            Keys are found in the Stripe Dashboard under Developers → API keys. The webhook secret comes from the endpoint you configure under Developers → Webhooks, and is used to verify that incoming events actually came from Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
