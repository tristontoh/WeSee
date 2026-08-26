/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Check, Loader2, Copy } from 'lucide-react';
import { mfaApi, TotpEnrollResponse } from '../../api/mfaApi';

interface TwoFactorAuthCardProps {
  onResult: (message: string, type: 'success' | 'warning') => void;
}

type ReauthAction = 'disable' | 'regenerate' | null;

export default function TwoFactorAuthCard({ onResult }: TwoFactorAuthCardProps) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [enabledAt, setEnabledAt] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<TotpEnrollResponse | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const [reauthAction, setReauthAction] = useState<ReauthAction>(null);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthCode, setReauthCode] = useState('');
  const [reauthBusy, setReauthBusy] = useState(false);

  const refresh = () => {
    setLoading(true);
    mfaApi.status()
      .then((s) => {
        setEnabled(s.enabled);
        setEnabledAt(s.enabledAt);
      })
      .catch(() => onResult('Failed to load 2FA status.', 'warning'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startEnroll = () => {
    setEnrolling(true);
    mfaApi.enroll()
      .then((res) => setEnrollment(res))
      .catch(() => onResult('Failed to start 2FA enrollment.', 'warning'))
      .finally(() => setEnrolling(false));
  };

  const cancelEnroll = () => {
    setEnrollment(null);
    setEnrollCode('');
  };

  const confirmEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    setEnrolling(true);
    mfaApi.verify(enrollCode)
      .then((res) => {
        setBackupCodes(res.backupCodes);
        setEnrollment(null);
        setEnrollCode('');
        setEnabled(true);
        setEnabledAt(new Date().toISOString());
      })
      .catch((err) => onResult(err?.message || 'Invalid verification code.', 'warning'))
      .finally(() => setEnrolling(false));
  };

  const finishBackupCodesReview = () => {
    setBackupCodes(null);
    onResult('Two-factor authentication is now enabled.', 'success');
  };

  const startReauth = (action: ReauthAction) => {
    setReauthAction(action);
    setReauthPassword('');
    setReauthCode('');
  };

  const submitReauth = (e: React.FormEvent) => {
    e.preventDefault();
    setReauthBusy(true);
    const call = reauthAction === 'disable'
      ? mfaApi.disable(reauthPassword, reauthCode).then(() => {
          setEnabled(false);
          setEnabledAt(null);
          onResult('Two-factor authentication has been disabled.', 'success');
        })
      : mfaApi.regenerateBackupCodes(reauthPassword, reauthCode).then((res) => {
          setBackupCodes(res.backupCodes);
        });

    call
      .then(() => setReauthAction(null))
      .catch((err) => onResult(err?.message || 'Verification failed.', 'warning'))
      .finally(() => setReauthBusy(false));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
      <div className="flex items-center space-x-2">
        <ShieldCheck className="w-4 h-4 text-gray-400" />
        <h3 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h3>
      </div>
      <p className="text-xs text-gray-500 mt-1 mb-6">
        Require a code from an authenticator app in addition to your password when signing in.
      </p>

      {backupCodes && (
        <div className="mb-6 border border-amber-200 bg-amber-50/60 rounded-xl p-5">
          <p className="text-xs font-bold text-amber-800 mb-1">Save your backup codes</p>
          <p className="text-[11px] text-amber-700 mb-4">
            Each code can be used once to sign in if you lose access to your authenticator app. Store them somewhere safe — they won't be shown again.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-xs">
            {backupCodes.map((code) => (
              <div key={code} className="px-3 py-1.5 bg-white border border-amber-100 rounded-lg text-gray-800">{code}</div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(backupCodes.join('\n'))}
              className="px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> Copy codes
            </button>
            <button
              type="button"
              onClick={finishBackupCodesReview}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            >
              I've saved these codes
            </button>
          </div>
        </div>
      )}

      {!enrollment && !backupCodes && !enabled && (
        <button
          type="button"
          onClick={startEnroll}
          disabled={enrolling}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
        >
          {enrolling ? 'Starting…' : 'Enable 2FA'}
        </button>
      )}

      {enrollment && (
        <form onSubmit={confirmEnroll} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <img src={enrollment.qrCodeDataUri} alt="2FA QR code" className="w-40 h-40 border border-gray-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-3">
              <p className="text-xs text-gray-500">
                Scan this QR code with an authenticator app (e.g. Google Authenticator, 1Password), or enter the code manually:
              </p>
              <code className="block text-xs font-mono bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 break-all">{enrollment.secret}</code>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Enter the 6-digit code to confirm</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={cancelEnroll} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={enrolling}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
            >
              {enrolling ? 'Verifying…' : 'Confirm & Enable'}
            </button>
          </div>
        </form>
      )}

      {enabled && !backupCodes && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 w-fit">
            <Check className="w-3.5 h-3.5" />
            <span>Enabled{enabledAt ? ` since ${new Date(enabledAt).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}</span>
          </div>

          {reauthAction === null && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => startReauth('regenerate')}
                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Regenerate backup codes
              </button>
              <button
                type="button"
                onClick={() => startReauth('disable')}
                className="px-4 py-2 text-red-500 hover:bg-red-50 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Disable 2FA
              </button>
            </div>
          )}

          {reauthAction !== null && (
            <form onSubmit={submitReauth} className="border border-gray-100 rounded-xl p-5 space-y-4 bg-gray-50/50">
              <p className="text-xs font-semibold text-gray-700">
                Confirm your password and current authentication code to {reauthAction === 'disable' ? 'disable 2FA' : 'regenerate backup codes'}.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Password</label>
                  <input
                    required
                    type="password"
                    value={reauthPassword}
                    onChange={(e) => setReauthPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Authentication code</label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="123456 or backup code"
                    value={reauthCode}
                    onChange={(e) => setReauthCode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setReauthAction(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reauthBusy}
                  className={`px-5 py-2 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-60 ${
                    reauthAction === 'disable' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                >
                  {reauthBusy ? 'Working…' : reauthAction === 'disable' ? 'Disable 2FA' : 'Regenerate Codes'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
