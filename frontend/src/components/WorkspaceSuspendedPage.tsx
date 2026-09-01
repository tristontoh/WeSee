/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import { Ban, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';

/**
 * Blocking screen for a workspace a platform admin has suspended, or whose own admin has closed it
 * (see AuthenticatedLayout's gate in App.tsx, and CompanyAccessFilter for the refusal itself).
 *
 * Unlike TrialExpiredPage there is deliberately no way out from here. A trial is a bill you can
 * pay; a suspension is a decision someone made, and offering a checkout would be taking money for
 * access that is not going to be granted. All this screen owes the reader is a straight answer and
 * a way to ask about it.
 */
export default function WorkspaceSuspendedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-app-mesh flex items-center justify-center px-6 py-12 font-sans">
      <div className="w-full max-w-md bg-white rounded-[22px] border border-gray-100 shadow-xl px-8 py-9 space-y-6">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
          <Ban className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">This workspace is suspended</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {user?.company ? <><strong className="text-gray-700">{user.company}</strong> no longer has access to
            WeSee.</> : 'Your workspace no longer has access to WeSee.'}{' '}
            Your data has not been deleted, and nothing you have signed off has changed.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-gray-900">If you were not expecting this</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Ask your company administrator first — an account closure is something they can start
            themselves. If it was not them, contact support and quote the email you signed in with.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            icon={<Mail className="w-4 h-4" />}
            onClick={() => { window.location.href = 'mailto:support@wesee.my?subject=Suspended%20workspace'; }}
          >
            Contact support
          </Button>
          <Button variant="ghost" size="sm" icon={<LogOut className="w-4 h-4" />} onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
