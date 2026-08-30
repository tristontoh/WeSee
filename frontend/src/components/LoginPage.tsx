/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  CheckCircle,
  HelpCircle,
  ChevronLeft,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { postLoginPath } from '../permissions';
import { CAPABILITIES } from '../capabilities';
import Button from './ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, completeMfaLogin, resendVerification, sessionExpired, clearSessionExpired } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Landed here because a request came back 401 (expired/invalid token) rather than an explicit
  // "Log out" click — explain why, then clear the flag so it doesn't resurface on a later visit.
  useEffect(() => {
    if (sessionExpired) {
      showToast('Your session has expired. Please log in again.', 'error');
      clearSessionExpired();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnverifiedEmail('');
    setResendState('idle');

    if (!email) {
      showToast('Please enter your corporate email address.', 'error');
      return;
    }
    if (!password) {
      showToast('Please enter your secure account password.', 'error');
      return;
    }

    setIsSubmitting(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const outcome = await login(email, password, rememberMe);
      if (outcome.status === 'email_verification_required') {
        setUnverifiedEmail(outcome.email);
        setIsSubmitting(false);
        return;
      }
      if (outcome.status === 'mfa_required') {
        setMfaToken(outcome.mfaToken);
        setMfaStep(true);
        setIsSubmitting(false);
        return;
      }
      showToast('Signed in. Taking you to your workspace…', 'success');

      // Short delay before redirecting for smooth UX
      setTimeout(() => {
        navigate(postLoginPath(outcome.profile.role, outcome.profile.onboardingCompleted));
      }, 600);
    } catch (error: any) {
      setIsSubmitting(false);
      showToast(error.message || 'Authentication failed. Please check your credentials.', 'error');
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const profile = await completeMfaLogin(mfaToken, mfaCode);
      showToast('Signed in. Taking you to your workspace…', 'success');
      setTimeout(() => {
        navigate(postLoginPath(profile.role, profile.onboardingCompleted));
      }, 600);
    } catch (error: any) {
      setIsSubmitting(false);
      showToast(error.message || 'Invalid code. Please try again.', 'error');
      // The global 401 handler fires on this failed request too (it fires on every 401), which
      // would otherwise flip sessionExpired=true even though no session existed yet — clear it so
      // a later fresh visit to /login doesn't show a stale "session expired" banner.
      clearSessionExpired();
    }
  };

  const handleResendVerification = async () => {
    setResendState('sending');
    try {
      await resendVerification(unverifiedEmail);
      setResendState('sent');
    } catch {
      setResendState('idle');
    }
  };

  const handleBackToLogin = () => {
    setMfaStep(false);
    setMfaToken('');
    setMfaCode('');
    setUseBackupCode(false);
  };

  return (
    <div className="min-h-screen bg-auth-photo flex text-gray-900 font-sans relative">

      {/* One scrim across the full width, not per-column: a gradient that stopped at the column
          boundary left a visible vertical step down the middle of the photograph. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E27]/75 via-[#0A0E27]/25 to-transparent pointer-events-none" />

      
      {/* Left section: Branding & Value Prop */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12">
        {/* The reference's blurred emerald blobs are gone: they were lighting for a solid green
            panel, and over a photograph they read as smudges — one sat exactly on the column edge
            and looked like a seam. */}

        <div className="relative z-10">
          <div className="flex items-center space-x-2.5 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-xl shadow-lg border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">WeSee</span>
          </div>

          <div className="space-y-6 max-w-lg">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.05]">
              Enterprise ESG <br/>Reporting Platform.
            </h1>
            <p className="text-white/80 text-xl leading-relaxed">
              Consolidate data, align with NSRF and IFRS standards, and automate your Bursa Malaysia disclosures in one secure environment.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center space-x-3 text-white text-base font-medium bg-white/10 w-fit px-4 py-2 rounded-full border border-white/25 backdrop-blur-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Bank Negara Climate Risk Aligned</span>
          </div>
          <div className="flex items-center space-x-3 text-white text-base font-medium bg-white/10 w-fit px-4 py-2 rounded-full border border-white/25 backdrop-blur-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>End-to-End Scope 3 Verification</span>
          </div>
        </div>
      </div>

      {/* Right section: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12 relative">
        
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-8 left-6 sm:left-12 flex items-center space-x-2 z-10">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-sm shadow-sm border border-navy-100">
              <img src="assets/wesee-logo.png" alt="WeSee" className="w-5 h-5 object-contain" />
            </div>
          <span className="text-lg font-black text-gray-900 tracking-tight">WeSee</span>
        </div>

        {/* Back Link */}
        <div className="absolute top-8 right-6 sm:right-12">
           <button 
             onClick={() => navigate('/')}
             className="text-sm font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer bg-[#0A0E27]/55 hover:bg-[#0A0E27]/75 border border-white/30 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg"
           >
             <ArrowLeft className="w-4 h-4" />
             <span>Back</span>
           </button>
        </div>

        <div className="relative w-full max-w-[520px] bg-white/60 backdrop-blur-xl border border-white/45 rounded-[28px] shadow-[0_30px_80px_rgba(5,8,30,.45)] px-9 sm:px-11 pt-10 pb-10 space-y-8">
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Welcome back</h3>
            <p className="text-sm text-gray-500 mt-2">Sign in to manage your sustainability indicators and corporate disclosures.</p>
          </div>
          
          {/* MFA Code Form */}
          {mfaStep ? (
          <form onSubmit={handleMfaSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                {useBackupCode ? 'Backup code' : 'Authentication code'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  inputMode={useBackupCode ? 'text' : 'numeric'}
                  placeholder={useBackupCode ? 'XXXX-XXXX' : '123456'}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center shadow-sm disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={handleBackToLogin} className="text-gray-500 hover:text-gray-700 font-semibold cursor-pointer">
                Back
              </button>
              <button
                type="button"
                onClick={() => { setUseBackupCode(!useBackupCode); setMfaCode(''); }}
                className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                {useBackupCode ? 'Use authenticator code instead' : 'Use a backup code instead'}
              </button>
            </div>
          </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email Not Verified */}
            {unverifiedEmail && (
              <div className="p-3.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-xs font-semibold shadow-sm space-y-2">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 shrink-0" />
                  <span>Please verify your email before signing in.</span>
                </div>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendState !== 'idle'}
                  className="text-amber-800 underline hover:text-amber-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Verification email sent' : 'Resend verification email'}
                </button>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Corporate Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700">Password</label>
                {CAPABILITIES.passwordReset && (
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs font-medium text-gray-600 cursor-pointer select-none">
                Remember me for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center shadow-sm disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </form>
          )}

          {!mfaStep && (
          <div className="text-center text-xs text-gray-500 pt-4">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-emerald-600 font-bold hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </div>
          )}

        </div>
      </div>
    </div>
  );
}