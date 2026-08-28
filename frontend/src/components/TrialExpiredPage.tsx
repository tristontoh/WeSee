/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, LogOut, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { billingApi } from '../api/billingApi';
import { planToBackend } from '../api/mappers';
import Button from './ui/Button';

/**
 * Self-contained blocking screen for a company whose free trial has ended (see
 * AuthenticatedLayout's trialExpired gate in App.tsx). Deliberately doesn't depend on any other
 * gated route — a blocked account can't reach /settings, so this page has its own "pay to
 * continue" flow (Stripe Checkout, confirmed on return via billingApi.confirmCheckout — see
 * CompanyBillingService for why there's no webhook yet) rather than relying on the one in
 * BillingView. A PLATFORM_ADMIN can also convert the account manually (Tenants > trial toggle).
 */
export default function TrialExpiredPage() {
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payingNow, setPayingNow] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Guards against firing confirmCheckout twice for the same return trip — both React's dev-mode
  // StrictMode double-effect *and* a real prod scenario (the user refreshes while "Confirming
  // your payment…" is still showing, before the finally() below has cleared session_id from the
  // URL) would otherwise POST the confirm call again. The backend call itself is idempotent, but
  // a second call still re-logs a duplicate TRIAL_CONVERTED activity entry and a duplicate toast.
  const confirmedSessionRef = useRef<string | null>(null);

  const trialEndedLabel = user?.trialEndsAt
    ? new Date(user.trialEndsAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      const sessionId = searchParams.get('session_id');
      if (sessionId && confirmedSessionRef.current !== sessionId) {
        confirmedSessionRef.current = sessionId;
        setConfirming(true);
        billingApi.confirmCheckout(sessionId)
          .then((res) => {
            if (res.converted) {
              updateUser({ trialConverted: true });
              showToast('Payment confirmed — welcome back!', 'success');
              // This page sits outside AuthenticatedLayout (a blocked account can't reach any
              // gated route to begin with), so nothing re-checks the trial gate on its own —
              // without this, the user stays stuck looking at this same blocking screen forever
              // despite having just paid.
              navigate('/dashboard', { replace: true });
            } else {
              showToast(res.message || 'Payment could not be confirmed yet.', 'error');
              setConfirming(false);
              setSearchParams({}, { replace: true });
            }
          })
          .catch((err) => {
            showToast(err?.message || 'Could not confirm payment.', 'error');
            setConfirming(false);
            setSearchParams({}, { replace: true });
          });
      }
    } else if (checkout === 'cancelled') {
      showToast('Checkout cancelled — no changes made.', 'info');
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePayNow = () => {
    if (!user) return;
    setPayingNow(true);
    billingApi.createCheckoutSession(planToBackend(user.plan), 'TRIAL_EXPIRED')
      .then((res) => {
        window.location.href = res.checkoutUrl;
      })
      .catch((err) => {
        showToast(err?.message || 'Failed to start checkout.', 'error');
        setPayingNow(false);
      });
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#F8F9FA] p-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl shadow-xl p-8 text-center space-y-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="p-2 bg-white border border-gray-200 rounded-xl">
            <img src="assets/wesee-logo.png" alt="WeSee" className="w-5 h-5 object-contain" />
          </div>
          <span className="text-sm font-bold tracking-tight text-gray-900">WeSee</span>
        </div>

        <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-gray-900">
            {confirming ? 'Confirming your payment…' : 'Your free trial has ended'}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {confirming
              ? 'Hang tight — this only takes a moment.'
              : trialEndedLabel
                ? `Your 14-day trial ended on ${trialEndedLabel}. Your workspace and data are safe — access is paused until your account is upgraded.`
                : 'Your workspace and data are safe — access is paused until your account is upgraded.'}
          </p>
        </div>

        {!confirming && (
          <>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              loading={payingNow}
              onClick={handlePayNow}
              icon={<CreditCard className="w-4 h-4" />}
            >
              Pay Now to Continue
            </Button>

            <p className="text-xs text-gray-400 leading-relaxed">
              Or contact your account administrator, or <span className="font-semibold text-gray-500">support@wesee.my</span>.
            </p>

            <Button variant="secondary" size="md" className="w-full" onClick={logout} icon={<LogOut className="w-4 h-4" />}>
              Log out
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
