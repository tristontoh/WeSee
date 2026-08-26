/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trees, Mail, ArrowRight, ArrowLeft, CheckCircle, MailCheck } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useToast } from '../contexts/ToastContext';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your account email address.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      // Backend never reveals whether the email exists — a failure here means the request itself broke.
      showToast(err?.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-auth-photo flex text-gray-900 font-sans relative">
      {/* One scrim across the full width, not per-column — see LoginPage. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E27]/75 via-[#0A0E27]/25 to-transparent pointer-events-none" />


      {/* Left section: Branding & Value Prop */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12">

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

      {/* Right section: Forgot Password Form */}
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
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer bg-[#0A0E27]/55 hover:bg-[#0A0E27]/75 border border-white/30 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        <div className="relative w-full max-w-[520px] bg-white/60 backdrop-blur-xl border border-white/45 rounded-[28px] shadow-[0_30px_80px_rgba(5,8,30,.45)] px-9 sm:px-11 pt-10 pb-10 space-y-8">
          {submitted ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <MailCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Check your email</h3>
                <p className="text-sm text-gray-500">
                  If an account exists for <strong className="text-gray-700">{email.trim()}</strong>, we've sent a password reset link. It expires in 1 hour.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center shadow-sm mt-2"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Forgot your password?</h3>
                <p className="text-sm text-gray-500 mt-2">Enter your account email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Send Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </button>
              </form>

              <div className="text-center text-xs text-gray-500 pt-4">
                Remember your password?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-emerald-600 font-bold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
