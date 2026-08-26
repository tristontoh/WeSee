/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
import { aiUsageApi, UsageSummaryResponse } from '../../api/aiUsageApi';

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AiUsageDashboard() {
  const [usage, setUsage] = useState<UsageSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  useEffect(() => {
    aiUsageApi.get(6).then(setUsage).catch((e) => console.error(e)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!usage || usage.months.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-2">
        <BarChart3 className="w-8 h-8 text-gray-300 mx-auto" />
        <p className="text-xs text-gray-500">No AI usage yet this period — usage appears here once "Draft with AI" or the assistant is used.</p>
      </div>
    );
  }

  const successRate = usage.totalRequests > 0
    ? Math.round((usage.months.reduce((sum, m) => sum + m.successCount, 0) / usage.totalRequests) * 100)
    : 0;
  const maxRequests = Math.max(...usage.months.map((m) => m.requestCount), 1);

  return (
    <div className="space-y-4">
      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Requests</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{compactNumber(usage.totalRequests)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Success Rate</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{successRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Tokens</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{compactNumber(usage.totalInputTokens + usage.totalOutputTokens)}</p>
        </div>
      </div>

      {/* Requests per month — single series, bar height carries the value */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h4 className="text-xs font-bold text-gray-900 mb-4">Requests per month</h4>
        <div className="flex items-end gap-3 h-32 relative">
          {usage.months.map((m) => {
            const heightPct = Math.max((m.requestCount / maxRequests) * 100, m.requestCount > 0 ? 4 : 0);
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center h-full relative">
                  <div
                    onMouseEnter={() => setHoveredMonth(m.month)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="w-full max-w-[24px] bg-primary-500 hover:bg-primary-600 rounded-t-[4px] transition-colors cursor-default"
                    style={{ height: `${heightPct}%`, minHeight: m.requestCount > 0 ? '4px' : '0' }}
                  />
                  {hoveredMonth === m.month && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold rounded-lg px-2.5 py-1.5 whitespace-nowrap z-10 shadow-lg">
                      {m.requestCount} request{m.requestCount === 1 ? '' : 's'} · {m.successCount} succeeded
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-gray-400 font-semibold">{formatMonth(m.month)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table view — exact figures, always available regardless of chart */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-2.5">Month</th>
              <th className="px-4 py-2.5 text-right">Requests</th>
              <th className="px-4 py-2.5 text-right">Succeeded</th>
              <th className="px-4 py-2.5 text-right">Input Tokens</th>
              <th className="px-4 py-2.5 text-right">Output Tokens</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usage.months.map((m) => (
              <tr key={m.month}>
                <td className="px-4 py-2.5 font-semibold text-gray-700">{formatMonth(m.month)}</td>
                <td className="px-4 py-2.5 text-right text-gray-900 font-mono">{m.requestCount}</td>
                <td className="px-4 py-2.5 text-right text-gray-500 font-mono">{m.successCount}</td>
                <td className="px-4 py-2.5 text-right text-gray-500 font-mono">{compactNumber(m.inputTokens)}</td>
                <td className="px-4 py-2.5 text-right text-gray-500 font-mono">{compactNumber(m.outputTokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
