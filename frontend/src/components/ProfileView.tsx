/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { userApi, UserProfileResponse } from '../api/userApi';
import ChangePasswordCard from './settings/ChangePasswordCard';
import TwoFactorAuthCard from './settings/TwoFactorAuthCard';

const ROLE_LABELS: Record<UserProfileResponse['role'], string> = {
  COMPANY_ADMIN: 'Company Admin',
  COMPANY_CONTRIBUTOR: 'Contributor',
  CONSULTANT: 'Consultant',
  PLATFORM_ADMIN: 'Platform Admin',
  SUPERADMIN: 'Super Admin',
};

export default function ProfileView() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    userApi.getMyProfile()
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setPhone(p.phone ?? '');
        setJobTitle(p.jobTitle ?? '');
        setDepartment(p.department ?? '');
        setBio(p.bio ?? '');
      })
      .catch(() => showToast('Failed to load your profile.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const initials = (profile?.name ?? '')
    .split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '—';

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    userApi.updateMyProfile({ name, phone, jobTitle, department, bio })
      .then((updated) => {
        setProfile(updated);
        updateUser({ name: updated.name });
        showToast('Profile updated.');
      })
      .catch(() => showToast('Failed to update profile.', 'error'))
      .finally(() => setSavingProfile(false));
  };

  if (loading) {
    return (
      <div className="w-full pb-16 text-center py-16 text-gray-400 text-sm font-medium">
        Loading your profile…
      </div>
    );
  }

  return (
    <div className="w-full pb-16">

      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">My Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your personal details and account security.</p>
      </div>

      {user?.mfaSetupRequired && (
        <div className="mb-6 flex items-center gap-2.5 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Your organization requires two-factor authentication — set it up below to continue using your account.</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">

        {/* Center: Profile form */}
        <div className="flex-1 space-y-6">

          <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
            <h3 className="text-lg font-bold text-gray-900">Profile</h3>
            <p className="text-xs text-gray-500 mt-1 mb-6">This information is visible to your organization.</p>

            <div className="flex items-center space-x-4 mb-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm"
                style={{ backgroundColor: profile?.avatarColor ?? '#059669' }}
              >
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{profile?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{profile?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Full name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Email address</label>
                <input
                  type="email"
                  disabled
                  value={profile?.email ?? ''}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50 outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Phone number</label>
                <input
                  type="tel"
                  placeholder="e.g. +60 12-345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Job title</label>
                <input
                  type="text"
                  placeholder="e.g. Sustainability Manager"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Finance, Operations, ESG"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Role</label>
                <input
                  type="text"
                  disabled
                  value={profile ? ROLE_LABELS[profile.role] : ''}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50 outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mb-8 space-y-2">
              <label className="text-xs font-semibold text-gray-700">Bio</label>
              <textarea
                placeholder="A short description about you"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors h-24 resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
              >
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>

          <ChangePasswordCard onResult={showToast} />
          <TwoFactorAuthCard onResult={showToast} />
        </div>

        {/* Right rail */}
        <div className="w-full md:w-80 flex flex-col space-y-4 shrink-0">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-6 flex flex-col items-center justify-center text-white">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg mb-3 shadow-inner">
                {initials}
              </div>
              <h4 className="font-bold text-sm">{profile?.name}</h4>
              <p className="text-[11px] text-emerald-100 mt-1">{profile?.email}</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Role</span>
                <span className="text-gray-900 font-bold">{profile ? ROLE_LABELS[profile.role] : '—'}</span>
              </div>
              {profile?.companyName && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Company</span>
                  <span className="text-gray-900 font-bold">{profile.companyName}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Member since</span>
                <span className="text-gray-900 font-bold">
                  {profile ? new Date(profile.memberSince).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5">
            <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>TIP</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              Keep your job title and department up to date — they help your team find the right person for a disclosure.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
