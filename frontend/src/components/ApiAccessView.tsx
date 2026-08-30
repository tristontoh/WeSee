/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  X,
  Check,
  Copy,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { canAccess, MANAGEMENT_ROLES } from '../permissions';
import { apiTokenApi, ApiTokenResponse, ApiScope } from '../api/apiTokenApi';
import Select from './ui/Select';

const SCOPE_LABELS: Record<ApiScope, string> = {
  INDICATORS_READ: 'Read Indicators',
  INDICATORS_WRITE: 'Write Indicators'
};

const SCOPE_DESCRIPTIONS: Record<ApiScope, string> = {
  INDICATORS_READ: 'GET indicator values and metadata via the external API.',
  INDICATORS_WRITE: 'POST new indicator values via the external API.'
};

const EXPIRY_OPTIONS: { label: string; days: number | undefined }[] = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'Never', days: undefined }
];

type TokenStatus = 'active' | 'revoked' | 'expired';

function tokenStatus(t: ApiTokenResponse): TokenStatus {
  if (t.revoked) return 'revoked';
  if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) return 'expired';
  return 'active';
}

const STATUS_STYLES: Record<TokenStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  revoked: { label: 'Revoked', className: 'bg-rose-50 text-rose-700 border-rose-100' },
  expired: { label: 'Expired', className: 'bg-navy-50 text-navy-500 border-navy-100' }
};

export default function ApiAccessView() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = canAccess(user?.role, MANAGEMENT_ROLES);

  const [tokens, setTokens] = useState<ApiTokenResponse[]>([]);
  /** First load only — revoking or creating a token must not blank the list. */
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<Set<ApiScope>>(new Set());
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(90);

  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const refreshTokens = () => {
    apiTokenApi.list().then(setTokens).catch((e) => console.error(e)).finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshTokens();
  }, []);

  const openCreateModal = () => {
    setName('');
    setSelectedScopes(new Set());
    setExpiresInDays(90);
    setRevealedToken(null);
    setCopied(false);
    setShowCreateModal(true);
  };

  const toggleScope = (scope: ApiScope) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === '') {
      showToast('Name is required.', 'error');
      return;
    }
    if (selectedScopes.size === 0) {
      showToast('Select at least one scope.', 'error');
      return;
    }
    apiTokenApi.create(name.trim(), Array.from(selectedScopes), expiresInDays)
      .then((created) => {
        setRevealedToken(created.token);
        refreshTokens();
      })
      .catch((e) => {
        console.error(e);
        showToast('Failed to create token.', 'error');
      });
  };

  const handleCopy = () => {
    if (!revealedToken) return;
    navigator.clipboard.writeText(revealedToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRevoke = (id: string) => {
    apiTokenApi.revoke(id).then(() => {
      refreshTokens();
      setConfirmRevokeId(null);
    }).catch((e) => console.error(e));
  };

  return (
    <div className="space-y-8 w-full pb-16 font-sans">

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-navy-100/40">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-primary-600 mb-1">
            <span className="px-2 py-0.5 bg-primary-50 rounded-md">Developer</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-950">API Access</h2>
          <p className="text-xs text-navy-500 mt-1 max-w-xl">
            Create scoped API tokens so external programs can GET and POST ESG data directly, without a logged-in user session.
          </p>
        </div>

        {canManage && (
          <Button variant="primary" size="sm" onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
            Create Token
          </Button>
        )}
      </div>

      {/* TOKEN LIST */}
      <Card className="bg-white border-navy-100 overflow-hidden" padded="none">
        {loading && tokens.length === 0 ? (
          <p className="text-sm text-navy-400 p-6 text-center">Loading tokens…</p>
        ) : tokens.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <KeyRound className="w-10 h-10 text-navy-300 mx-auto" />
            <h5 className="text-xs font-bold text-navy-950">No API tokens yet</h5>
            <p className="text-[11px] text-navy-400 max-w-sm mx-auto">
              Create a token to let an external program GET or POST data via the scoped external API.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-navy-100 bg-navy-50/10 text-[9px] font-bold text-navy-400 uppercase tracking-widest font-mono">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Token</th>
                  <th className="px-6 py-3.5">Scopes</th>
                  <th className="px-6 py-3.5">Last Used</th>
                  <th className="px-6 py-3.5">Expires</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                {tokens.map((t) => {
                  const status = tokenStatus(t);
                  const isConfirming = confirmRevokeId === t.id;
                  return (
                    <tr key={t.id} className="hover:bg-navy-50/10 transition-colors">
                      <td className="px-6 py-4 font-bold text-navy-950">{t.name}</td>
                      <td className="px-6 py-4 font-mono text-[11px] text-navy-500">{t.tokenPrefix}&hellip;</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {t.scopes.map((s) => (
                            <span key={s} className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 uppercase tracking-wide">
                              {SCOPE_LABELS[s]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-navy-500 font-mono text-[11px]">
                        {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-navy-500 font-mono text-[11px]">
                        {t.expiresAt ? new Date(t.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide ${STATUS_STYLES[status].className}`}>
                          {STATUS_STYLES[status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canManage && status === 'active' && (
                          isConfirming ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleRevoke(t.id)}
                                className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmRevokeId(null)}
                                className="px-2 py-1 text-[10px] font-bold text-navy-500 hover:text-navy-700 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRevokeId(t.id)}
                              className="p-1.5 text-navy-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="Revoke token"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE TOKEN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowCreateModal(false)}
          />

          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-navy-100 relative z-10 overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 to-indigo-500" />

            <div className="flex items-start justify-between pb-4 border-b border-navy-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl border border-primary-100">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-navy-950 uppercase tracking-wider">
                    {revealedToken ? 'Token Created' : 'New API Token'}
                  </h4>
                  <p className="text-[10px] text-navy-400 font-semibold">
                    {revealedToken ? 'Copy your token now — it will not be shown again' : 'Grant only the scopes an integration actually needs'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-navy-400 hover:text-navy-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {revealedToken ? (
              <div className="space-y-4 pt-4 text-xs font-semibold">
                <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 font-bold">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This is the only time you'll see this token. Copy it now — it cannot be retrieved again.</span>
                </div>

                <div className="flex items-center gap-2 bg-navy-50/50 border border-navy-100 rounded-xl px-3 py-2.5">
                  <code className="flex-1 text-[11px] font-mono text-navy-900 break-all">{revealedToken}</code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 text-navy-500 hover:text-primary-600 hover:bg-white rounded-lg cursor-pointer transition-colors shrink-0"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="primary" size="sm" onClick={() => setShowCreateModal(false)} icon={<Check className="w-4 h-4" />}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4 pt-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Token Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Utility Bill Ingestion Script"
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Scopes</label>
                  <div className="space-y-2">
                    {(Object.keys(SCOPE_LABELS) as ApiScope[]).map((scope) => (
                      <label
                        key={scope}
                        className="flex items-start gap-2.5 p-2.5 border border-navy-100 rounded-xl cursor-pointer hover:bg-navy-50/40"
                      >
                        <input
                          type="checkbox"
                          checked={selectedScopes.has(scope)}
                          onChange={() => toggleScope(scope)}
                          className="mt-0.5 rounded border-navy-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-navy-900 block">{SCOPE_LABELS[scope]}</span>
                          <span className="text-[10px] text-navy-400 font-medium">{SCOPE_DESCRIPTIONS[scope]}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Expiry</label>
                  <Select
                    className="w-full"
                    aria-label="Expires in"
                    value={String(expiresInDays ?? '')}
                    onChange={(v) => setExpiresInDays(v === '' ? undefined : Number(v))}
                    options={EXPIRY_OPTIONS.map((opt) => ({
                      value: String(opt.days ?? ''),
                      label: opt.label,
                    }))}
                  />
                </div>


                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit" icon={<KeyRound className="w-4 h-4" />}>
                    Create Token
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
