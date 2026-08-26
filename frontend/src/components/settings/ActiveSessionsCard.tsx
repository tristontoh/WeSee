/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Monitor, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { sessionApi, SessionResponse } from '../../api/sessionApi';

interface ActiveSessionsCardProps {
  onResult: (message: string, type: 'success' | 'warning') => void;
}

function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';

  const browser = /Edg\//.test(userAgent) ? 'Edge'
    : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Firefox\//.test(userAgent) ? 'Firefox'
    : /Safari\//.test(userAgent) ? 'Safari'
    : 'Unknown browser';

  const os = /Windows/.test(userAgent) ? 'Windows'
    : /Mac OS X/.test(userAgent) ? 'macOS'
    : /Android/.test(userAgent) ? 'Android'
    : /iPhone|iPad/.test(userAgent) ? 'iOS'
    : /Linux/.test(userAgent) ? 'Linux'
    : 'Unknown OS';

  return `${browser} on ${os}`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function ActiveSessionsCard({ onResult }: ActiveSessionsCardProps) {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const refresh = () => {
    setLoading(true);
    sessionApi.list()
      .then(setSessions)
      .catch(() => onResult('Failed to load active sessions.', 'warning'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const revoke = (session: SessionResponse) => {
    setBusyId(session.id);
    sessionApi.revoke(session.id)
      .then(() => {
        if (session.current) {
          logout();
          return;
        }
        setSessions((prev) => prev.filter((s) => s.id !== session.id));
      })
      .catch(() => onResult('Failed to revoke session.', 'warning'))
      .finally(() => setBusyId(null));
  };

  const revokeOthers = () => {
    setRevokingOthers(true);
    sessionApi.revokeOthers()
      .then(() => {
        onResult('Signed out of all other devices.', 'success');
        setSessions((prev) => prev.filter((s) => s.current));
      })
      .catch(() => onResult('Failed to sign out other devices.', 'warning'))
      .finally(() => setRevokingOthers(false));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <Monitor className="w-4 h-4 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900">Active Sessions</h3>
        </div>
        {sessions.length > 1 && (
          <button
            type="button"
            onClick={revokeOthers}
            disabled={revokingOthers}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition-colors disabled:opacity-60"
          >
            {revokingOthers ? 'Working…' : 'Log out of all other devices'}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1 mb-6">Devices currently signed in to your account.</p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{describeDevice(session.userAgent)}</span>
                  {session.current && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase">This device</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {session.ipAddress ?? 'Unknown IP'} · Last active {relativeTime(session.lastSeenAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(session)}
                disabled={busyId === session.id}
                className="px-3 py-1.5 text-red-500 hover:bg-red-50 text-xs font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-60"
              >
                {busyId === session.id ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">No active sessions found.</p>
          )}
        </div>
      )}
    </div>
  );
}
