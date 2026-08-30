/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Check, AlertCircle, Eye, EyeOff, Zap } from 'lucide-react';
import Button from '../ui/Button';
import { aiSettingsApi, AiProviderConfigResponse, AiProvider } from '../../api/aiSettingsApi';
import { useToast } from '../../contexts/ToastContext';
import AiUsageDashboard from './AiUsageDashboard';
import Select from '../ui/Select';

const PROVIDER_LABELS: Record<AiProvider, string> = {
  ANTHROPIC: 'Anthropic (Claude)',
  OPENAI: 'OpenAI (GPT)',
  GEMINI: 'Google (Gemini)',
};

const CUSTOM_MODEL_VALUE = '__custom__';

/** Curated per-provider model choices — a "Custom" option is always last so a newly released
 *  model can be used immediately without a code change here. */
const MODEL_OPTIONS: Record<AiProvider, { value: string; label: string }[]> = {
  ANTHROPIC: [
    { value: 'claude-opus-5', label: 'Opus 5 — most capable' },
    { value: 'claude-sonnet-5', label: 'Sonnet 5 — balanced' },
    { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 — fastest, lowest cost' },
  ],
  OPENAI: [
    { value: 'gpt-4.1', label: 'GPT-4.1 — most capable' },
    { value: 'gpt-4o', label: 'GPT-4o — balanced' },
    { value: 'gpt-4o-mini', label: 'GPT-4o mini — fastest, lowest cost' },
  ],
  GEMINI: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — most capable' },
    { value: 'gemini-flash-latest', label: 'Gemini Flash (latest) — balanced' },
    { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite — fastest, lowest cost' },
  ],
};

export default function AiSettingsTab() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AiProviderConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [provider, setProvider] = useState<AiProvider>('ANTHROPIC');
  const [model, setModel] = useState(MODEL_OPTIONS.ANTHROPIC[0].value);
  const [modelChoice, setModelChoice] = useState<string>(MODEL_OPTIONS.ANTHROPIC[0].value);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const refresh = () => {
    setLoading(true);
    aiSettingsApi.get()
      .then((s) => {
        setSettings(s);
        const effectiveProvider = s.provider ?? 'ANTHROPIC';
        if (s.provider) setProvider(s.provider);
        const savedModel = s.model ?? MODEL_OPTIONS[effectiveProvider][0].value;
        setModel(savedModel);
        const knownOption = MODEL_OPTIONS[effectiveProvider].some((o) => o.value === savedModel);
        setModelChoice(knownOption ? savedModel : CUSTOM_MODEL_VALUE);
        setEnabled(s.enabled);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    aiSettingsApi.update({ provider, model, apiKey, enabled })
      .then((s) => {
        setSettings(s);
        setApiKey('');
        showToast('AI settings saved.', 'success');
      })
      .catch((err) => showToast(err?.message || 'Failed to save AI settings.', 'error'))
      .finally(() => setSaving(false));
  };

  const handleTest = () => {
    setTesting(true);
    aiSettingsApi.test()
      .then((result) => showToast(result.message, result.success ? 'success' : 'error'))
      .catch((err) => showToast(err?.message || 'Failed to test the connection.', 'error'))
      .finally(() => setTesting(false));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
    <div className="flex flex-col lg:flex-row gap-8">
      <form onSubmit={handleSave} className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg font-bold text-gray-900">AI Assistant</h3>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Bring your own API key to power "Draft with AI" on narrative fields and the Q&amp;A assistant. Your key is encrypted at rest and never shown once saved.
        </p>

        <div className="mb-6 space-y-2">
          <label className="text-xs font-semibold text-gray-700">Provider</label>
          <Select
            className="w-full"
            aria-label="AI provider"
            value={provider}
            onChange={(v) => {
              const nextProvider = v as AiProvider;
              setProvider(nextProvider);
              const firstOption = MODEL_OPTIONS[nextProvider][0].value;
              setModelChoice(firstOption);
              setModel(firstOption);
            }}
            options={(Object.keys(PROVIDER_LABELS) as AiProvider[]).map((p) => ({
              value: p,
              label: PROVIDER_LABELS[p],
            }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Model</label>
            <Select
              className="w-full"
              aria-label="Model"
              value={modelChoice}
              onChange={(v) => {
                setModelChoice(v);
                if (v !== CUSTOM_MODEL_VALUE) setModel(v);
              }}
              options={[
                ...MODEL_OPTIONS[provider].map((o) => ({ value: o.value, label: o.label })),
                { value: CUSTOM_MODEL_VALUE, label: 'Custom…' },
              ]}
            />
            {modelChoice === CUSTOM_MODEL_VALUE && (
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Exact model ID, e.g. gemini-3.5-flash-lite"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors mt-2"
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">API Key {settings?.apiKeySet && <span className="text-gray-400 font-normal">(leave blank to keep existing)</span>}</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={settings?.apiKeySet ? '••••••••••••••••' : ''} className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {settings?.apiKeySet && settings.provider !== provider && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-6">
            Switching providers requires entering a new API key for {PROVIDER_LABELS[provider]} — keys aren't shared across providers.
          </p>
        )}

        <label className="flex items-center gap-2.5 mb-8 cursor-pointer w-fit">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
          <span className="text-xs font-semibold text-gray-700">Enabled — allow AI drafting and the assistant to use this key</span>
        </label>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={handleTest} loading={testing} disabled={!settings?.configured} icon={<Zap className="w-4 h-4" />}>
            Test Connection
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
              {settings?.configured ? (
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wider">Configured</span>
              ) : (
                <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 uppercase tracking-wider">Not Configured</span>
              )}
            </div>
            {settings?.configured && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">State</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                  settings.enabled ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-gray-500 bg-gray-100 border-gray-200'
                }`}>{settings.enabled ? 'Active' : 'Disabled'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TIP</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed font-medium">
            Your API key is billed directly by your provider — usage below is for your visibility only, WeSee doesn't cap or charge for it.
          </p>
        </div>
      </div>
    </div>

    {settings?.configured && (
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-4">Usage (last 6 months)</h3>
        <AiUsageDashboard />
      </div>
    )}
    </div>
  );
}
