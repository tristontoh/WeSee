/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  User, Shield, Link as LinkIcon, Calendar, Building,
  FileText,
  CreditCard,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Lock, Bell,
  ArrowRight,
  TrendingUp,
  Sliders,
  HelpCircle,
  FileCheck,
  Mail,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Send
} from 'lucide-react';
import { usePlan, PlanType } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { canAccess, hasPermission, MANAGEMENT_ROLES } from '../permissions';
import { CAPABILITIES } from '../capabilities';
import { authApi } from '../api/authApi';
import { emailSettingsApi, EmailSettingsResponse } from '../api/emailSettingsApi';
import { referenceApi, PublicPlanPricingResponse } from '../api/referenceApi';
import Button from './ui/Button';
import Card from './ui/Card';
import SecuritySettingsTab from './settings/SecuritySettingsTab';
import CompanyTab from './settings/CompanyTab';
import PrivacyDataTab from './settings/PrivacyDataTab';
import NotificationsTab from './settings/NotificationsTab';
import AiSettingsTab from './settings/AiSettingsTab';
import PromptLibraryTab from './settings/PromptLibraryTab';

// 1. MATERIALITY ASSESSMENT
export function MaterialityAssessmentView() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900">Materiality Assessment</h3>
        <p className="text-xs text-gray-500 mt-1">Determine the ESG matters of greatest significance to your operations and stakeholders.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card padded="lg" className="bg-white border-gray-100 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider bg-primary-50 px-2 py-0.5 rounded border border-primary-100 inline-block">Double Materiality</span>
            <h4 className="text-sm font-bold text-gray-900">Stakeholder Survey Status</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Conduct surveys automatically to map stakeholder concerns against commercial and climate risk factors. Automatically generates materiality matrix curves compliant with Bursa guidelines.
            </p>
          </div>
          <div className="border-t border-gray-50 pt-4 mt-6 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Completed surveys: <strong className="text-gray-900">14 / 20</strong></span>
            <Button variant="primary" size="sm">Manage Surveys</Button>
          </div>
        </Card>

        <Card padded="lg" className="bg-white border-gray-100 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">Matrix Mapping</span>
            <h4 className="text-sm font-bold text-gray-900">Materiality Matrix</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Visualize your top-priority economic, environmental, and social disclosures mapped across twin axes: stakeholder significance and corporate impact.
            </p>
          </div>
          <div className="border-t border-gray-50 pt-4 mt-6 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Priority ESG topics: <strong className="text-gray-900">9 Matters</strong></span>
            <Button variant="secondary" size="sm">View Matrix Plot</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// 2. GOVERNANCE (Gated for Starter - Moved to separate component)

// 3. INDICATORS (Moved to separate component)

// 4. TARGETS (moved to standalone TargetsView.tsx — real API-backed feature)

// 11. BILLING & PLAN (read-only — plan is fixed by the target market chosen at onboarding)
const PLAN_COPY: Record<PlanType, { title: string; subtitle: string; description: string; accent: string; ring: string; badge: string }> = {
  'starter': {
    title: 'Starter Plan',
    subtitle: 'SME & Vendor Focused',
    description: 'Excellent for micro-enterprises. Satisfy basic tier-1 ESG disclosure inquiries with SEDG templates.',
    accent: 'border-emerald-500',
    ring: 'ring-emerald-500/30',
    badge: 'text-emerald-700 bg-emerald-50 border-emerald-200'
  },
  'growth': {
    title: 'Growth Plan',
    subtitle: 'Mid-Market Corp',
    description: 'Define custom targets, complete boards governance audits, and compile multi-user disclosures.',
    accent: 'border-primary-500',
    ring: 'ring-primary-500/30',
    badge: 'text-primary-700 bg-primary-50 border-primary-200'
  },
  'issuer-ready': {
    title: 'Issuer-Ready',
    subtitle: 'Listed Corporations',
    description: 'Complete IFRS Scope 3, assurance logs, and direct uploads to Bursa’s Centralised Intelligence (CSI) system.',
    accent: 'border-purple-500',
    ring: 'ring-purple-500/30',
    badge: 'text-purple-700 bg-purple-50 border-purple-200'
  }
};

export function BillingView() {
  const { plan } = usePlan();
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<Record<PlanType, number> | null>(null);

  useEffect(() => {
    referenceApi.planPricing()
      .then((rows: PublicPlanPricingResponse[]) => {
        const byPlan = {} as Record<PlanType, number>;
        rows.forEach((r) => {
          if (r.plan === 'STARTER') byPlan['starter'] = r.monthlyPrice;
          if (r.plan === 'GROWTH') byPlan['growth'] = r.monthlyPrice;
          if (r.plan === 'ISSUER_READY') byPlan['issuer-ready'] = r.monthlyPrice;
        });
        setPricing(byPlan);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-900 to-primary-950 border border-gray-800 rounded-2xl p-6 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-44 h-44 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary-400 bg-primary-950/80 px-2 py-0.5 rounded border border-primary-900">Workspace Plan</span>
          <h3 className="text-2xl font-black tracking-tight mt-3 mb-2">Your Subscription</h3>
          <p className="text-xs text-gray-200 leading-relaxed mb-6">
            Your plan tier is determined by the target market you registered under and is fixed for the life of the account. To change markets or upgrade your tier, contact support — this is not a self-service toggle.
          </p>

          <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-xl p-3.5 max-w-md text-xs">
            <span className="text-gray-300">Active Tier:</span>
            <span className="text-white font-extrabold uppercase tracking-widest text-[11px] block pl-1">
              {plan === 'starter' && '🟢 Starter Plan (SME)'}
              {plan === 'growth' && '🔵 Growth Plan (Mid-Market)'}
              {plan === 'issuer-ready' && '✨ Issuer-Ready Plan (Listed Enterprise)'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {(Object.keys(PLAN_COPY) as PlanType[]).map((tier) => {
          const copy = PLAN_COPY[tier];
          const isActive = plan === tier;
          return (
            <Card
              key={tier}
              className={`flex flex-col justify-between p-6 bg-white border ${isActive ? `${copy.accent} shadow-md ring-1 ${copy.ring}` : 'border-gray-100'}`}
              padded="none"
            >
              <div className="space-y-4 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900">{copy.title}</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">{copy.subtitle}</p>
                  </div>
                  {isActive && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border ${copy.badge}`}>Active</span>
                  )}
                </div>
                <div className="flex items-baseline space-x-1.5 pt-2">
                  <span className="text-2xl font-black text-gray-900 font-mono">
                    {pricing ? `RM ${pricing[tier].toFixed(0)}` : '—'}
                  </span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{copy.description}</p>
              </div>
              <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                <div className="w-full py-2.5 rounded-xl text-xs font-bold text-center bg-gray-100 text-gray-500 border border-gray-200">
                  {isActive ? 'Your Current Plan' : `Requires ${copy.title}`}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-5">
        <div>
          <h4 className="text-sm font-bold text-gray-900">Need a different plan?</h4>
          <p className="text-xs text-gray-500 mt-0.5">Plan changes go through support since they involve re-classifying your registered target market.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/support', { state: { openNewTicket: true } })}>
          Contact Support
        </Button>
      </div>
    </div>
  );
}

// 12. SETTINGS
type SettingsTabId = 'profile' | 'security' | 'notifications' | 'smtp' | 'company' | 'billing' | 'privacy' | 'ai' | 'prompts';

interface SettingsTab {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeClass?: string;
  adminOnly?: boolean;
  /** Permission-based visibility (mirrors App.tsx's nav-item convention) — shown if the user has ANY of these keys. Takes precedence over adminOnly when present. */
  requiresAnyPermission?: string[];
  /** Hidden outright unless the backend serves this subsystem — see capabilities.ts. */
  requiresCapability?: keyof typeof CAPABILITIES;
}

const SETTINGS_TABS: SettingsTab[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'smtp', label: 'Email (SMTP)', icon: Mail, adminOnly: true },
  { id: 'company', label: 'Company', icon: Building, adminOnly: true },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { id: 'privacy', label: 'Privacy & Data', icon: Lock, adminOnly: true },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles, requiresCapability: 'ai', requiresAnyPermission: ['ai.view', 'ai.manage'] },
  { id: 'prompts', label: 'Prompt Library', icon: FileText, requiresCapability: 'ai', requiresAnyPermission: ['prompts.view', 'prompts.manage'] },
];

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: 'Admin',
  COMPANY_CONTRIBUTOR: 'Contributor',
  CONSULTANT: 'Consultant',
  PLATFORM_ADMIN: 'Platform Admin',
  SUPERADMIN: 'Superadmin'
};

export function SettingsView() {
  const { user } = useAuth();
  const canManage = canAccess(user?.role, MANAGEMENT_ROLES);
  const visibleTabs = SETTINGS_TABS.filter((t) => {
    if (t.requiresCapability && !CAPABILITIES[t.requiresCapability]) return false;
    if (t.requiresAnyPermission) return t.requiresAnyPermission.some((key) => hasPermission(user?.role, user?.permissions, key));
    return !t.adminOnly || canManage;
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as SettingsTabId | null;

  /**
   * Checked against the tabs this user can actually see, not the whole catalogue: a contributor
   * deep-linked to `?tab=company` would otherwise select a tab whose body is admin-gated, leaving
   * the page blank.
   */
  const isReachable = (id: SettingsTabId | null): id is SettingsTabId =>
    id != null && visibleTabs.some((t) => t.id === id);

  const [activeTab, setActiveTab] = useState<SettingsTabId>(() =>
    isReachable(requestedTab) ? requestedTab : 'profile');

  // Re-read on every change to the parameter, not only on mount. The company switcher links to
  // /settings?tab=company (see AuthTopBar), and under a HashRouter that navigation changes the
  // query without remounting — so a reader already on Settings would sit on the wrong tab.
  useEffect(() => {
    if (isReachable(requestedTab)) setActiveTab(requestedTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTab]);

  /** Keeps the address bar honest, so a copied link reopens the tab actually on screen. */
  const selectTab = (id: SettingsTabId) => {
    setActiveTab(id);
    // Replaced rather than pushed: a tab is a view of one screen, not a place to go Back to.
    setSearchParams({ tab: id }, { replace: true });
  };

  return (
    <div className="w-full pb-16">

      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h2>
      </div>

      {/* Top Settings Tabs */}
      <div className="border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1 min-w-max">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tab.badgeClass}`}>{tab.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab !== 'profile' && activeTab !== 'smtp' && activeTab !== 'security' && activeTab !== 'company' && activeTab !== 'privacy' && activeTab !== 'notifications' && activeTab !== 'billing' && activeTab !== 'ai' && activeTab !== 'prompts' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
            {React.createElement(SETTINGS_TABS.find((t) => t.id === activeTab)!.icon, { className: 'w-5 h-5 text-gray-400' })}
          </div>
          <h3 className="text-sm font-bold text-gray-900">{SETTINGS_TABS.find((t) => t.id === activeTab)!.label}</h3>
          <p className="text-xs text-gray-500 max-w-sm">This section is coming soon.</p>
        </div>
      )}

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'security' && <SecuritySettingsTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'billing' && <BillingView />}
      {activeTab === 'smtp' && canManage && <SmtpSettingsTab />}
      {activeTab === 'company' && canManage && <CompanyTab />}
      {activeTab === 'privacy' && canManage && <PrivacyDataTab />}
      {activeTab === 'ai' && <AiSettingsTab />}
      {activeTab === 'prompts' && <PromptLibraryTab />}
    </div>
  );
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx === -1) return { firstName: trimmed, lastName: '' };
  return { firstName: trimmed.slice(0, spaceIdx), lastName: trimmed.slice(spaceIdx + 1) };
}

function ProfileTab() {
  const { user, updateProfile, updateUser } = useAuth();

  const initial = splitName(user?.name ?? '');
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.hasAvatar) {
      setAvatarUrl(null);
      return;
    }
    let cancelled = false;
    authApi.avatarUrl().then((blob) => {
      if (cancelled) return;
      setAvatarUrl(URL.createObjectURL(blob));
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.hasAvatar]);

  const initials = (firstName[0] ?? '') + (lastName[0] ?? user?.name?.[1] ?? '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      await updateProfile({
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth,
        address,
        bio
      });
      setSaveMessage({ type: 'success', text: 'Profile saved.' });
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err?.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    setAvatarError('');
    authApi.uploadAvatar(file)
      .then((me) => {
        updateUser({ hasAvatar: me.hasAvatar });
        return authApi.avatarUrl();
      })
      .then((blob) => setAvatarUrl(URL.createObjectURL(blob)))
      .catch((err) => setAvatarError(err?.message || 'Failed to upload photo.'))
      .finally(() => setAvatarBusy(false));
  };

  const handleRemoveAvatar = () => {
    setAvatarBusy(true);
    setAvatarError('');
    authApi.removeAvatar()
      .then((me) => {
        updateUser({ hasAvatar: me.hasAvatar });
        setAvatarUrl(null);
      })
      .catch((err) => setAvatarError(err?.message || 'Failed to remove photo.'))
      .finally(() => setAvatarBusy(false));
  };

  const completionChecks = [firstName, lastName, email, phone, dateOfBirth, address, bio, user?.hasAvatar ? 'y' : ''];
  const completionPct = Math.round((completionChecks.filter((v) => v && v.trim?.() !== '').length / completionChecks.length) * 100);

  return (
    <div className="flex flex-col md:flex-row gap-8">

      {/* Center Content: Profile Form */}
      <form onSubmit={handleSave} className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
         <h3 className="text-lg font-bold text-gray-900">Profile</h3>
         <p className="text-xs text-gray-500 mt-1 mb-6">This information will be displayed on your account.</p>

         <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileSelected} />

         <div className="flex items-center space-x-4 mb-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl overflow-hidden shrink-0">
               {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : (initials.toUpperCase() || <User className="w-6 h-6" />)}
            </div>
            <div className="flex-1">
               <p className="text-sm font-semibold text-gray-900 mb-1">Profile Photo</p>
               <p className="text-xs text-gray-500">PNG or JPG, max 2MB</p>
            </div>
            <div className="flex items-center space-x-3">
               <button type="button" onClick={handleUploadClick} disabled={avatarBusy} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50">
                 {avatarBusy ? 'Working…' : 'Upload'}
               </button>
               <button type="button" onClick={handleRemoveAvatar} disabled={avatarBusy || !user?.hasAvatar} className="px-4 py-2 text-red-500 hover:bg-red-50 text-xs font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                 Remove
               </button>
            </div>
         </div>
         {avatarError && <p className="text-[11px] text-rose-600 font-semibold mb-4">{avatarError}</p>}
         <div className={avatarError ? '' : 'mb-6'} />

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
               <label className="text-xs font-semibold text-gray-700">First name</label>
               <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div className="space-y-2">
               <label className="text-xs font-semibold text-gray-700">Last name</label>
               <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
            </div>
         </div>

         <div className="mb-1 space-y-2">
            <label className="text-xs font-semibold text-gray-700">Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
         </div>
         <p className="text-[10px] text-gray-400 mb-6">Used for account recovery and statements</p>

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
               <label className="text-xs font-semibold text-gray-700">Phone number</label>
               <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+60 12-345 6789" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div className="space-y-2">
               <label className="text-xs font-semibold text-gray-700">Date of birth</label>
               <div className="relative">
                 <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
                 <Calendar className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>
            </div>
         </div>

         <div className="mb-6 space-y-2">
            <label className="text-xs font-semibold text-gray-700">Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Corporate Tower, KLCC&#10;50088 Kuala Lumpur&#10;Malaysia" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors h-24 resize-none leading-relaxed" />
         </div>

         <div className="mb-6 space-y-2">
            <label className="text-xs font-semibold text-gray-700">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short description about your role." className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors h-24 resize-none leading-relaxed" />
         </div>

         {saveMessage && (
           <div className={`flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2 mb-4 ${
             saveMessage.type === 'success' ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'
           }`}>
             {saveMessage.type === 'success' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
             <span>{saveMessage.text}</span>
           </div>
         )}

         <div className="flex justify-end">
           <Button variant="primary" type="submit" loading={saving} icon={<Check className="w-4 h-4" />}>
             Save Changes
           </Button>
         </div>
      </form>

      {/* Right Content: Profile Cards */}
      <div className="w-full md:w-80 flex flex-col space-y-4 shrink-0">

         {/* Profile Progress Card */}
         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-6 flex flex-col items-center justify-center text-white">
               <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg mb-3 shadow-inner overflow-hidden">
                 {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : initials.toUpperCase()}
               </div>
               <h4 className="font-bold text-sm">{user?.name}</h4>
               <p className="text-[11px] text-emerald-100 mt-1">{user?.email}</p>
            </div>
            <div className="p-5">
               <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Profile Completion</span>
                  <span className="text-xs font-bold text-gray-900">{completionPct}%</span>
               </div>
               <div className="w-full bg-gray-100 h-1.5 rounded-full mb-3">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${completionPct}%` }}></div>
               </div>
               <p className="text-[11px] text-gray-500 font-medium">
                 {completionPct === 100 ? 'All set! Your profile is complete.' : 'Fill in the remaining fields to complete your profile.'}
               </p>
            </div>
         </div>

         {/* Account Info Card */}
         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Account Info</h4>
            <div className="space-y-4">
               <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Company</span>
                  <span className="text-gray-900 font-bold">{user?.company || '—'}</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Role</span>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wider">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Plan</span>
                  <span className="text-gray-900 font-bold capitalize">{user?.plan}</span>
               </div>
            </div>
         </div>

         {/* Tip Card */}
         <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5">
            <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs mb-2">
               <Sparkles className="w-3.5 h-3.5" />
               <span>TIP</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
               Keep your profile updated — your name and email appear on reports and invoices sent to regulators.
            </p>
         </div>

      </div>
    </div>
  );
}

function SmtpSettingsTab() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<EmailSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fromAddress, setFromAddress] = useState('');
  const [enabled, setEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refresh = () => {
    setLoading(true);
    emailSettingsApi.get()
      .then((s) => {
        setSettings(s);
        setSmtpHost(s.smtpHost ?? '');
        setSmtpPort(s.smtpPort ?? 587);
        setSmtpUsername(s.smtpUsername ?? '');
        setFromAddress(s.fromAddress ?? '');
        setEnabled(s.enabled);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setTestMessage(null);
    emailSettingsApi.update({ smtpHost, smtpPort, smtpUsername, password, fromAddress, enabled })
      .then((s) => {
        setSettings(s);
        setPassword('');
        setSaveMessage({ type: 'success', text: 'SMTP settings saved.' });
      })
      .catch((err) => setSaveMessage({ type: 'error', text: err?.message || 'Failed to save SMTP settings.' }))
      .finally(() => setSaving(false));
  };

  const handleTest = () => {
    setTesting(true);
    setTestMessage(null);
    emailSettingsApi.sendTest()
      .then((result) => {
        setTestMessage({ type: result.success ? 'success' : 'error', text: result.message });
        refresh();
      })
      .catch((err) => setTestMessage({ type: 'error', text: err?.message || 'Failed to send test email.' }))
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
    <div className="flex flex-col lg:flex-row gap-8">
      <form onSubmit={handleSave} className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg font-bold text-gray-900">Outbound Email (SMTP)</h3>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Bring your own SMTP so invites and other notifications are sent from your own domain. If not configured, the platform default sender is used instead where available.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-gray-700">SMTP Host</label>
            <input type="text" required value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.sendgrid.net" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Port</label>
            <input type="number" required value={smtpPort} onChange={(e) => setSmtpPort(parseInt(e.target.value, 10) || 587)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Username</label>
            <input type="text" required value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="apikey" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Password {settings?.passwordSet && <span className="text-gray-400 font-normal">(leave blank to keep existing)</span>}</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={settings?.passwordSet ? '••••••••' : ''} className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <label className="text-xs font-semibold text-gray-700">From address</label>
          <input type="email" required value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="noreply@yourcompany.my" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors" />
        </div>

        <label className="flex items-center gap-2.5 mb-8 cursor-pointer w-fit">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
          <span className="text-xs font-semibold text-gray-700">Enabled — use these settings for outbound email</span>
        </label>

        {saveMessage && (
          <div className={`flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2 mb-4 ${
            saveMessage.type === 'success' ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'
          }`}>
            {saveMessage.type === 'success' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            <span>{saveMessage.text}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={handleTest} loading={testing} disabled={!settings?.configured} icon={<Send className="w-4 h-4" />}>
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
            {settings?.lastTestAt && (
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

        {testMessage && (
          <div className={`rounded-2xl border p-5 ${testMessage.type === 'success' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
            <div className={`flex items-center space-x-2 font-bold text-xs mb-2 ${testMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {testMessage.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{testMessage.type === 'success' ? 'TEST SENT' : 'TEST FAILED'}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed font-medium break-words">{testMessage.text}</p>
          </div>
        )}

        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TIP</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed font-medium">
            Test emails are sent to your own address ({user?.email}) so you can confirm delivery before your team relies on it for invites.
          </p>
        </div>
      </div>
    </div>
  );
}