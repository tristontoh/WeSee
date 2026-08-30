/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '../api/authApi';
import Button from './ui/Button';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('This verification link is missing a token.');
      setLoading(false);
      return;
    }
    authApi.verifyEmail(token)
      .then(() => setVerified(true))
      .catch((e: any) => setError(e?.message || 'This link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

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
              <p className="text-xs text-gray-500 font-semibold">Verifying your email...</p>
            </div>
          ) : error ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-gray-900">Verification link not valid</h3>
                <p className="text-xs text-gray-500">{error}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
                Go to Sign In
              </Button>
            </div>
          ) : (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-gray-900">Your email is verified</h3>
                <p className="text-xs text-gray-500">You can now sign in to your WeSee account.</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                Continue to Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
