/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertCircle, Download, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { privacyApi, downloadJson } from '../../api/privacyApi';
import Switch from '../ui/Switch';

export default function PrivacyDataTab() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // --- Cookie & marketing consent ---
  const [consentLoading, setConsentLoading] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

  useEffect(() => {
    privacyApi.getConsent()
      .then((c) => {
        setMarketingConsent(c.marketingConsent);
        setAnalyticsConsent(c.analyticsConsent);
      })
      .catch(() => showToast('Failed to load privacy preferences.', 'error'))
      .finally(() => setConsentLoading(false));
  }, []);

  const saveConsent = (nextMarketing: boolean, nextAnalytics: boolean) => {
    setSavingConsent(true);
    privacyApi.updateConsent(nextMarketing, nextAnalytics)
      .then((c) => {
        setMarketingConsent(c.marketingConsent);
        setAnalyticsConsent(c.analyticsConsent);
        showToast('Privacy preferences saved.', 'success');
      })
      .catch(() => showToast('Failed to save privacy preferences.', 'error'))
      .finally(() => setSavingConsent(false));
  };

  const toggleMarketingConsent = () => {
    if (savingConsent) return;
    const next = !marketingConsent;
    setMarketingConsent(next);
    saveConsent(next, analyticsConsent);
  };

  const toggleAnalyticsConsent = () => {
    if (savingConsent) return;
    const next = !analyticsConsent;
    setAnalyticsConsent(next);
    saveConsent(marketingConsent, next);
  };

  // --- Data export ---
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    privacyApi.exportData()
      .then((data) => {
        downloadJson(data, `WeSee_Company_Data_Export_${new Date().toISOString().slice(0, 10)}.json`);
        showToast('Your data export has been downloaded.', 'success');
      })
      .catch(() => showToast('Failed to generate your data export.', 'error'))
      .finally(() => setExporting(false));
  };

  // --- Close account ---
  const [confirmName, setConfirmName] = useState('');
  const [closing, setClosing] = useState(false);
  const companyName = user?.company ?? '';

  const handleCloseAccount = () => {
    if (confirmName !== companyName) return;
    setClosing(true);
    privacyApi.closeAccount(confirmName)
      .then(() => {
        logout();
        navigate('/login');
      })
      .catch(() => {
        showToast('Failed to close the account — please try again.', 'error');
        setClosing(false);
      });
  };

  return (
    <div className="space-y-6">
      {/* Download data */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <div className="flex items-center space-x-2">
          <Download className="w-4 h-4 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900">Download Your Company Data</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Export a JSON bundle of everything stored against your company — profile, team, indicators, materiality, governance, compliance policies, targets, and sign-off history.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Preparing…' : 'Download my data'}
        </button>
      </div>

      {/* Consent preferences */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg font-bold text-gray-900">Cookie & Marketing Preferences</h3>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Controls how WeSee may contact your company and use product-analytics data. These apply company-wide.
        </p>

        {consentLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <button type="button" disabled={savingConsent} onClick={toggleMarketingConsent} className="text-left cursor-pointer disabled:cursor-not-allowed">
                <span className="text-sm font-semibold text-gray-900 block">Marketing communications</span>
                <span className="text-[11px] text-gray-500">Product updates, webinars, and Bursa compliance guidance by email.</span>
              </button>
              <Switch checked={marketingConsent} disabled={savingConsent} onChange={toggleMarketingConsent} className="mt-1 shrink-0" />
            </div>
            <div className="flex items-start justify-between gap-4">
              <button type="button" disabled={savingConsent} onClick={toggleAnalyticsConsent} className="text-left cursor-pointer disabled:cursor-not-allowed">
                <span className="text-sm font-semibold text-gray-900 block">Product analytics</span>
                <span className="text-[11px] text-gray-500">Usage data that helps us improve the reporting workflow.</span>
              </button>
              <Switch checked={analyticsConsent} disabled={savingConsent} onChange={toggleAnalyticsConsent} className="mt-1 shrink-0" />
            </div>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6 lg:p-8">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <h3 className="text-lg font-bold text-gray-900">Close Company Account</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Deactivates {companyName || 'your company'} and every subsidiary in its group, and signs out every team member immediately. This does not erase your records — a platform administrator can reactivate the account if you change your mind. To permanently erase all data, contact support after closing.
        </p>

        <div className="space-y-2 max-w-md">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
            Type <span className="text-gray-900">{companyName}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={companyName}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400 transition-colors"
          />
          <button
            type="button"
            onClick={handleCloseAccount}
            disabled={closing || confirmName !== companyName}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
          >
            {closing ? 'Closing…' : 'Close Company Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
