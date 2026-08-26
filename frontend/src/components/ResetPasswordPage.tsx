/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Check, X } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { showToast } = useToast();

  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const valLength = password.length >= 8;
  const valNumber = /\d/.test(password);
  const valCapital = /[A-Z]/.test(password);
  const valSpecial = /[^A-Za-z0-9]/.test(password);

  useEffect(() => {
    if (!token) {
      setTokenError('This reset link is missing a token.');
      setCheckingToken(false);
      return;
    }
    authApi.validateResetToken(token)
      .then(() => setCheckingToken(false))
      .catch((e: any) => {
        setTokenError(e?.message || 'This link is invalid or has expired.');
        setCheckingToken(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (!valLength || !valNumber || !valCapital || !valSpecial) {
      showToast('Please meet all password strength indicators.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setResetDone(true);
    } catch (err: any) {
      showToast(err?.message || 'This link is invalid or has expired.', 'error');
    } finally {
      setIsSubmitting(false);
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
          {checkingToken ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500 font-semibold">Checking your reset link...</p>
            </div>
          ) : tokenError ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-gray-900">Reset link not valid</h3>
                <p className="text-xs text-gray-500">{tokenError}</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => navigate('/forgot-password')}>
                Request a New Link
              </Button>
            </div>
          ) : resetDone ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-gray-900">Password updated</h3>
                <p className="text-xs text-gray-500">You can now sign in with your new password. You've been signed out of all other sessions.</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                Continue to Sign In
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Set a new password</h3>
                <p className="text-sm text-gray-500 mt-1">Choose a new secure password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      autoFocus
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
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Password Strength</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    <div className="flex items-center space-x-1.5">
                      {valLength ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      <span className={valLength ? 'text-emerald-700 font-bold' : 'text-gray-500'}>Min 8 chars</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {valCapital ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      <span className={valCapital ? 'text-emerald-700 font-bold' : 'text-gray-500'}>Upper case</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {valNumber ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      <span className={valNumber ? 'text-emerald-700 font-bold' : 'text-gray-500'}>One number</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {valSpecial ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      <span className={valSpecial ? 'text-emerald-700 font-bold' : 'text-gray-500'}>Special symbol</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Confirm New Password</label>
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
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl py-2.5 flex items-center justify-center transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
