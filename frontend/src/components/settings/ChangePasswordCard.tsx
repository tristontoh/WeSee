/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userApi } from '../../api/userApi';

interface ChangePasswordCardProps {
  onResult: (message: string, type: 'success' | 'warning') => void;
}

export default function ChangePasswordCard({ onResult }: ChangePasswordCardProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const submitPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onResult('New password and confirmation do not match.', 'warning');
      return;
    }
    setChangingPassword(true);
    userApi.changePassword({ currentPassword, newPassword })
      .then(() => {
        onResult('Password changed — please log in again.', 'success');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      })
      .catch(() => onResult('Failed to change password — check your current password.', 'warning'))
      .finally(() => setChangingPassword(false));
  };

  return (
    <form onSubmit={submitPasswordChange} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
      <div className="flex items-center space-x-2">
        <Lock className="w-4 h-4 text-gray-400" />
        <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
      </div>
      <p className="text-xs text-gray-500 mt-1 mb-6">You'll be signed out on this device afterwards.</p>

      <div className="space-y-4 mb-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Current password</label>
          <input
            required
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">New password</label>
            <input
              required
              minLength={8}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[10px] text-gray-400">At least 8 characters</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Confirm new password</label>
            <input
              required
              minLength={8}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={changingPassword}
          className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-semibold rounded-full cursor-pointer transition-all shadow-sm"
        >
          {changingPassword ? 'Changing…' : 'Change Password'}
        </button>
      </div>
    </form>
  );
}
