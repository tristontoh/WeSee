/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle,
  Building2,
  Info,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authApi, InvitePreviewResponse } from '../api/authApi';
import { postLoginPath } from '../permissions';
import Button from './ui/Button';

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: 'Admin',
  COMPANY_CONTRIBUTOR: 'Contributor',
  CONSULTANT: 'Consultant'
};

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { acceptInvite } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InvitePreviewResponse | null>(null);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const valLength = password.length >= 8;

  useEffect(() => {
    if (!token) {
      setLoadError('This invite link is missing a token.');
      setLoading(false);
      return;
    }
    authApi.previewInvite(token)
      .then((preview) => {
        setInvite(preview);
        setName(preview.name);
      })
      .catch((e: any) => {
        setLoadError(e?.message || 'This invite link is invalid or has expired.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Please enter your full name.', 'error');
      return;
    }
    if (!valLength) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await acceptInvite(token, name.trim(), password);
      navigate(postLoginPath(user.role, user.onboardingCompleted));
    } catch (error: any) {
      setIsSubmitting(false);
      showToast(error?.message || 'Failed to accept this invite. It may have already been used.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-auth-photo flex items-center justify-center px-6 py-12 font-sans">
      <div className="max-w-md w-full space-y-8">

        <div className="flex items-center justify-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-xl shadow-lg border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-6 h-6 object-contain" />
            </div>
          <span className="text-2xl font-black text-gray-900 tracking-tight">WeSee</span>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/45 rounded-3xl p-6 sm:p-8 shadow-xl">
          {loading ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500 font-semibold">Checking your invite...</p>
            </div>
          ) : loadError || !invite ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-gray-900">Invite link not valid</h3>
                <p className="text-xs text-gray-500">{loadError}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
                Go to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1 text-center">
                <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 w-fit mx-auto">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{invite.companyName}</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 pt-2">You've been invited</h3>
                <p className="text-xs text-gray-500">
                  {invite.invitedByName ? `${invite.invitedByName} invited you` : "You've been invited"} to join as{' '}
                  <strong className="text-gray-700">{ROLE_LABELS[invite.role] ?? invite.role}</strong>. Set a password to finish joining.
                </p>
              </div>


              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={invite.email}
                    disabled
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-sm rounded-xl text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Create Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center space-x-1.5 text-xs pt-0.5">
                  {valLength ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                  <span className={valLength ? 'text-emerald-700 font-bold' : 'text-gray-400 font-medium'}>Min 8 characters</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center justify-center transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Joining...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5">
                    <span>Accept Invite &amp; Join</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="flex justify-center text-[10px] font-medium text-gray-400">
          <div className="flex items-center">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" />
            <span>PDPA Data Privacy Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
