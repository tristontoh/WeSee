/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  AlertCircle,
  Calendar,
  SlidersHorizontal
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import Select from './ui/Select';
import { useToast } from '../contexts/ToastContext';
import { targetsApi, PerformanceTargetResponse, UpsertPerformanceTargetRequest } from '../api/targetsApi';
import { indicatorsApi, IndicatorResponse } from '../api/indicatorsApi';
import { computeTargetStatus, TARGET_STATUS_STYLES, TargetStatus } from '../utils/targetStatus';

const currentYear = new Date().getFullYear();
// Mirrors Dashboard.tsx / IndicatorsView.tsx — the most recent fiscal year tracked by this app.
const CURRENT_FISCAL_YEAR = 2026;

interface TargetFormState {
  title: string;
  description: string;
  baselineYear: string;
  targetYear: string;
  targetValue: string;
  currentProgress: string;
  indicatorId: string;
  horizon: 'NEAR_TERM' | 'LONG_TERM';
}

const EMPTY_FORM: TargetFormState = {
  title: '',
  description: '',
  baselineYear: String(currentYear),
  targetYear: String(currentYear + 5),
  targetValue: '',
  currentProgress: '',
  indicatorId: '',
  horizon: 'NEAR_TERM'
};

const HORIZON_LABEL: Record<'NEAR_TERM' | 'LONG_TERM', string> = {
  NEAR_TERM: 'Near-term',
  LONG_TERM: 'Long-term'
};

/**
 * Glide-path mini chart for a target linked to an indicator with real historical data: bars for
 * each year's actual value plus a dashed straight reference line from the baseline actual to the
 * target value at targetYear (SBTi-style straight-line glide path, no stored milestones needed).
 */
function renderGlidePath(target: PerformanceTargetResponse, indicator: IndicatorResponse) {
  const years: number[] = [];
  for (let y = target.baselineYear; y <= target.targetYear; y++) years.push(y);

  const width = 260;
  const height = 80;
  const barGap = 6;
  const barWidth = years.length > 1 ? (width - barGap * (years.length - 1)) / years.length : width;

  const actuals = years.map((y) => indicator.values.find((v) => v.fiscalYear === y)?.value ?? null);
  const baselineActual = indicator.values.find((v) => v.fiscalYear === target.baselineYear)?.value ?? null;

  const allVals = [...actuals.filter((v): v is number => v !== null), target.targetValue, baselineActual ?? 0];
  const maxVal = Math.max(1, ...allVals);
  const minVal = Math.min(0, ...allVals);
  const range = Math.max(1, maxVal - minVal);
  const toY = (v: number) => height - ((v - minVal) / range) * height;

  const glideX1 = barWidth / 2;
  const glideX2 = (years.length - 1) * (barWidth + barGap) + barWidth / 2;
  const glideY1 = baselineActual !== null ? toY(baselineActual) : toY(0);
  const glideY2 = toY(target.targetValue);

  return (
    <svg width={width} height={height + 18} className="mx-auto overflow-visible">
      {actuals.map((v, idx) => {
        const x = idx * (barWidth + barGap);
        const barHeight = v !== null ? height - toY(v) : 0;
        return (
          <g key={idx}>
            <rect
              x={x} y={toY(v ?? minVal)} width={barWidth} height={Math.max(barHeight, v !== null ? 3 : 0)}
              rx={2} fill={v !== null ? '#10b981' : '#e5e7eb'}
            />
            <text x={x + barWidth / 2} y={height + 13} fontSize="8" textAnchor="middle" fill="#94a3b8" fontFamily="monospace">
              FY{years[idx]}
            </text>
          </g>
        );
      })}
      <line x1={glideX1} y1={glideY1} x2={glideX2} y2={glideY2} stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 3" />
      <circle cx={glideX2} cy={glideY2} r={2.5} fill="#6366f1" />
    </svg>
  );
}

// The backend now returns currentProgress as a real 0-100 percentage (computed live from indicator
// data when linked, or the manually-entered value otherwise) — clamp only, no re-derivation needed.
function clampPercent(currentProgress: number): number {
  return Math.max(0, Math.min(100, currentProgress));
}

export default function TargetsView() {
  const { showToast } = useToast();
  const [targets, setTargets] = useState<PerformanceTargetResponse[]>([]);
  const [indicators, setIndicators] = useState<IndicatorResponse[]>([]);

  // Create/edit modal state — editingTargetId is null when creating, set when editing an existing target
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<TargetFormState>(EMPTY_FORM);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);

  // Filter & sort state
  const [statusFilter, setStatusFilter] = useState<TargetStatus | 'ALL'>('ALL');
  const [horizonFilter, setHorizonFilter] = useState<'ALL' | 'NEAR_TERM' | 'LONG_TERM'>('ALL');
  const [sortBy, setSortBy] = useState<'TARGET_YEAR' | 'TITLE' | 'PROGRESS'>('TARGET_YEAR');

  // Inline progress editing state (local text buffer keyed by target id) — only used for targets
  // with no linked indicator; linked targets show a computed, read-only percentage instead.
  const [progressDrafts, setProgressDrafts] = useState<Record<string, string>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});

  // Delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refreshTargets = () => {
    targetsApi.list().then((data) => {
      setTargets(data);
      const drafts: Record<string, string> = {};
      data.forEach((t) => { drafts[t.id] = String(t.currentProgress); });
      setProgressDrafts(drafts);
    });
  };

  useEffect(() => {
    refreshTargets();
    indicatorsApi.list().then(setIndicators);
  }, []);

  const triggerSaveIndicator = (id: string) => {
    setSavedStatus((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setSavedStatus((prev) => ({ ...prev, [id]: false }));
    }, 1500);
  };

  const handleProgressCommit = (target: PerformanceTargetResponse) => {
    const raw = progressDrafts[target.id];
    const num = Number(raw);
    if (raw === undefined || raw.trim() === '' || isNaN(num) || num < 0) {
      // Revert to last known good value
      setProgressDrafts((prev) => ({ ...prev, [target.id]: String(target.currentProgress) }));
      return;
    }

    if (num === target.currentProgress) return;

    // Optimistic local update
    setTargets((prev) => prev.map((t) => (t.id === target.id ? { ...t, currentProgress: num } : t)));

    const payload: UpsertPerformanceTargetRequest = {
      title: target.title,
      description: target.description ?? undefined,
      baselineYear: target.baselineYear,
      targetYear: target.targetYear,
      targetValue: target.targetValue,
      currentProgress: num,
      indicatorId: target.indicatorId ?? undefined,
      horizon: target.horizon
    };

    targetsApi.update(target.id, payload).then((updated) => {
      setTargets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setProgressDrafts((prev) => ({ ...prev, [updated.id]: String(updated.currentProgress) }));
    });

    triggerSaveIndicator(target.id);
  };

  const handleDelete = (id: string) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    targetsApi.delete(id);
    setConfirmDeleteId(null);
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setEditingTargetId(null);
    setShowCreateModal(true);
  };

  const openEditModal = (target: PerformanceTargetResponse) => {
    setForm({
      title: target.title,
      description: target.description ?? '',
      baselineYear: String(target.baselineYear),
      targetYear: String(target.targetYear),
      targetValue: String(target.targetValue),
      currentProgress: target.progressComputed ? '' : String(target.currentProgress),
      indicatorId: target.indicatorId ?? '',
      horizon: target.horizon
    });
    setEditingTargetId(target.id);
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingTargetId(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (form.title.trim() === '') {
      showToast('Title is required.', 'error');
      return;
    }

    const baselineYear = Number(form.baselineYear);
    const targetYear = Number(form.targetYear);
    const targetValue = Number(form.targetValue);
    const currentProgress = form.currentProgress.trim() === '' ? undefined : Number(form.currentProgress);

    if (isNaN(baselineYear) || isNaN(targetYear) || isNaN(targetValue)) {
      showToast('Baseline year, target year, and target value must be valid numbers.', 'error');
      return;
    }
    if (targetYear <= baselineYear) {
      showToast('Target year must be after the baseline year.', 'error');
      return;
    }
    if (currentProgress !== undefined && (isNaN(currentProgress) || currentProgress < 0)) {
      showToast('Starting progress must be a non-negative number.', 'error');
      return;
    }

    const payload: UpsertPerformanceTargetRequest = {
      title: form.title.trim(),
      description: form.description.trim() === '' ? undefined : form.description.trim(),
      baselineYear,
      targetYear,
      targetValue,
      currentProgress,
      indicatorId: form.indicatorId || undefined,
      horizon: form.horizon
    };

    if (editingTargetId) {
      targetsApi.update(editingTargetId, payload).then((updated) => {
        setTargets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setProgressDrafts((prev) => ({ ...prev, [updated.id]: String(updated.currentProgress) }));
        closeModal();
      }).catch((err) => {
        showToast(err?.details?.[0] || err?.message || 'Failed to save target. Please check your inputs and try again.', 'error');
      });
    } else {
      targetsApi.create(payload).then((created) => {
        setTargets((prev) => [...prev, created]);
        setProgressDrafts((prev) => ({ ...prev, [created.id]: String(created.currentProgress) }));
        closeModal();
      }).catch((err) => {
        showToast(err?.details?.[0] || err?.message || 'Failed to save target. Please check your inputs and try again.', 'error');
      });
    }
  };

  const statusCounts: Record<TargetStatus, number> = {
    complete: 0, 'on-track': 0, 'off-track': 0, overdue: 0, 'not-started': 0,
  };
  targets.forEach((t) => { statusCounts[computeTargetStatus(t, CURRENT_FISCAL_YEAR)]++; });

  const hasActiveFilters = statusFilter !== 'ALL' || horizonFilter !== 'ALL';

  const visibleTargets = targets
    .filter((t) => statusFilter === 'ALL' || computeTargetStatus(t, CURRENT_FISCAL_YEAR) === statusFilter)
    .filter((t) => horizonFilter === 'ALL' || t.horizon === horizonFilter)
    .slice()
    .sort((a, b) => {
      if (sortBy === 'TITLE') return a.title.localeCompare(b.title);
      if (sortBy === 'PROGRESS') return clampPercent(a.currentProgress) - clampPercent(b.currentProgress);
      return a.targetYear - b.targetYear;
    });

  const clearFilters = () => {
    setStatusFilter('ALL');
    setHorizonFilter('ALL');
  };

  return (
    <div className="space-y-8 w-full pb-16 font-sans">

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-navy-100/40">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-primary-600 mb-1">
            <span className="px-2 py-0.5 bg-primary-50 rounded-md">Science-Based Targets</span>
            <span>•</span>
            <span>Bursa Sustainability Statements</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-950">
            Targets &amp; Goals Tracking
          </h2>
          <p className="text-xs text-navy-500 mt-1">
            Establish, adjust, and monitor science-based carbon mitigation and governance targets.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Target
          </Button>
        </div>
      </div>

      {/* STATS STRIP — click a tile to filter by that status */}
      {targets.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`text-left p-3.5 rounded-2xl border transition-colors cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-navy-50 border-navy-200 ring-1 ring-inset ring-navy-300' : 'bg-white border-navy-100 hover:bg-navy-50/50'
            }`}
          >
            <div className="text-lg font-bold text-navy-950">{targets.length}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-navy-400">Total</div>
          </button>
          {(['on-track', 'off-track', 'overdue', 'complete', 'not-started'] as TargetStatus[]).map((s) => {
            const active = statusFilter === s;
            const style = TARGET_STATUS_STYLES[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(active ? 'ALL' : s)}
                className={`text-left p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                  active ? `${style.className} ring-1 ring-inset ring-current` : 'bg-white border-navy-100 hover:bg-navy-50/50'
                }`}
              >
                <div className="text-lg font-bold text-navy-950">{statusCounts[s]}</div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${active ? '' : 'text-navy-400'}`}>{style.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* FILTER & SORT TOOLBAR */}
      {targets.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-navy-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wider font-bold">Filter</span>
          </div>
          <Select
            size="sm"
            className="w-[150px]"
            aria-label="Filter by horizon"
            value={horizonFilter}
            onChange={(v) => setHorizonFilter(v as 'ALL' | 'NEAR_TERM' | 'LONG_TERM')}
            options={[
              { value: 'ALL', label: 'All horizons' },
              { value: 'NEAR_TERM', label: 'Near-term' },
              { value: 'LONG_TERM', label: 'Long-term' },
            ]}
          />

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[11px] font-bold text-primary-600 hover:text-primary-700 cursor-pointer"
            >
              Clear filters
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] uppercase tracking-wider font-bold text-navy-400">Sort</span>
            <Select
              size="sm"
              className="w-[210px]"
              aria-label="Sort targets"
              value={sortBy}
              onChange={(v) => setSortBy(v as 'TARGET_YEAR' | 'TITLE' | 'PROGRESS')}
              options={[
                { value: 'TARGET_YEAR', label: 'Target year (soonest)' },
                { value: 'TITLE', label: 'Title (A–Z)' },
                { value: 'PROGRESS', label: 'Progress (lowest first)' },
              ]}
            />
          </div>
        </div>
      )}

      {/* EMPTY STATES */}
      {targets.length === 0 ? (
        <div className="text-center p-12 bg-white border border-navy-100/50 rounded-3xl space-y-3">
          <Target className="w-8 h-8 text-navy-300 mx-auto" />
          <h5 className="text-xs font-bold text-navy-950">No targets defined yet</h5>
          <p className="text-[11px] text-navy-400 max-w-sm mx-auto">
            Add a performance target to start tracking progress toward your decarbonization, waste, or governance goals.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={openCreateModal}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Target
            </Button>
          </div>
        </div>
      ) : visibleTargets.length === 0 ? (
        <div className="text-center p-12 bg-white border border-navy-100/50 rounded-3xl space-y-3">
          <SlidersHorizontal className="w-8 h-8 text-navy-300 mx-auto" />
          <h5 className="text-xs font-bold text-navy-950">No targets match these filters</h5>
          <p className="text-[11px] text-navy-400 max-w-sm mx-auto">
            Try adjusting or clearing the status and horizon filters above.
          </p>
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {visibleTargets.map((target) => {
            const percent = clampPercent(target.currentProgress);
            const isSaved = savedStatus[target.id];
            const linkedIndicator = target.indicatorId ? indicators.find((i) => i.id === target.indicatorId) : undefined;
            const isConfirmingDelete = confirmDeleteId === target.id;
            const status = computeTargetStatus(target, CURRENT_FISCAL_YEAR);
            const statusStyle = TARGET_STATUS_STYLES[status];
            const showGlidePath = target.progressComputed && linkedIndicator;

            return (
              <Card key={target.id} className="bg-white border-navy-100 p-6 space-y-4 relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-sm font-bold text-navy-950 truncate">{target.title}</h4>
                    {target.description && (
                      <p className="text-xs text-navy-500 leading-relaxed">{target.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSaved && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1 animate-fade-in font-mono">
                        <Check className="w-3 h-3" />
                        <span>Saved</span>
                      </span>
                    )}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(target.id)}
                          className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-[10px] font-bold text-navy-500 hover:text-navy-700 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => openEditModal(target)}
                          className="p-1.5 text-navy-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer transition-colors"
                          title="Edit target"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(target.id)}
                          className="p-1.5 text-navy-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Delete target"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-[10px] text-navy-400 font-bold uppercase tracking-wider font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>{target.baselineYear} &rarr; {target.targetYear}</span>
                  </div>
                  <span className="text-[10px] font-bold text-navy-500 bg-navy-50 border border-navy-100 rounded-md px-2 py-0.5">
                    {HORIZON_LABEL[target.horizon]}
                  </span>
                  <span className={`text-[10px] font-bold border rounded-md px-2 py-0.5 ${statusStyle.className}`}>
                    {statusStyle.label}
                  </span>
                </div>

                {linkedIndicator && (
                  <div className="text-[10px] text-primary-600 font-bold bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 w-fit">
                    <Target className="w-3 h-3" />
                    <span>Linked to: {linkedIndicator.name}</span>
                  </div>
                )}

                {showGlidePath ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[11px] text-navy-500">
                      <span>Glide path toward target</span>
                      <span className="font-bold text-navy-900">{percent.toFixed(0)}%</span>
                    </div>
                    {renderGlidePath(target, linkedIndicator!)}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] text-navy-500">
                      <span>Progress toward target</span>
                      <span className="font-bold text-navy-900">{percent.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-navy-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )}

                {target.progressComputed ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-navy-50">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                      Auto-calculated from indicator data
                    </span>
                    <span className="text-[11px] text-navy-400 font-semibold">/ {target.targetValue} target</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pt-2 border-t border-navy-50">
                    <label className="text-[10px] font-bold text-navy-400 uppercase tracking-wider shrink-0">
                      Current Progress
                    </label>
                    <input
                      type="number"
                      value={progressDrafts[target.id] ?? String(target.currentProgress)}
                      onChange={(e) => setProgressDrafts((prev) => ({ ...prev, [target.id]: e.target.value }))}
                      onBlur={() => handleProgressCommit(target)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="w-24 px-2.5 py-1.5 text-xs font-bold text-navy-900 bg-navy-50/40 border border-navy-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                    />
                    <span className="text-[11px] text-navy-400 font-semibold">/ {target.targetValue} target</span>
                    {linkedIndicator && (
                      <span className="text-[10px] text-amber-600 font-semibold">(not enough indicator data yet to auto-calculate)</span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================
          CREATE TARGET MODAL
         ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity"
            onClick={closeModal}
          />

          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-navy-100 relative z-10 overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 to-indigo-500" />

            <div className="flex items-start justify-between pb-4 border-b border-navy-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl border border-primary-100">
                  {editingTargetId ? <Pencil className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-navy-950 uppercase tracking-wider">
                    {editingTargetId ? 'Edit Performance Target' : 'New Performance Target'}
                  </h4>
                  <p className="text-[10px] text-navy-400 font-semibold">
                    {editingTargetId ? 'Update the goal, timeline, or linked indicator' : 'Define a measurable goal with a baseline and target year'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-navy-400 hover:text-navy-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 pt-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Decarbonization Target (Scope 1 & 2)"
                  className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider">Description (optional)</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Aiming for 30% reduction in net emissions by 2030."
                  className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider">Horizon</label>
                <Select
                  className="w-full"
                  aria-label="Target horizon"
                  value={form.horizon}
                  onChange={(v) => setForm((prev) => ({ ...prev, horizon: v as 'NEAR_TERM' | 'LONG_TERM' }))}
                  options={[
                    { value: 'NEAR_TERM', label: 'Near-term (5–10 years)' },
                    { value: 'LONG_TERM', label: 'Long-term (e.g. 2050 net-zero)' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Baseline Year</label>
                  <input
                    type="number"
                    required
                    value={form.baselineYear}
                    onChange={(e) => setForm((prev) => ({ ...prev, baselineYear: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Target Year</label>
                  <input
                    type="number"
                    required
                    value={form.targetYear}
                    onChange={(e) => setForm((prev) => ({ ...prev, targetYear: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Target Value</label>
                  <input
                    type="number"
                    required
                    value={form.targetValue}
                    onChange={(e) => setForm((prev) => ({ ...prev, targetValue: e.target.value }))}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                {!form.indicatorId && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-navy-400 uppercase tracking-wider">Starting Progress (optional)</label>
                    <input
                      type="number"
                      value={form.currentProgress}
                      onChange={(e) => setForm((prev) => ({ ...prev, currentProgress: e.target.value }))}
                      placeholder="e.g. 0"
                      className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider">Link to Indicator (optional)</label>
                <Select
                  className="w-full"
                  aria-label="Linked indicator"
                  value={form.indicatorId}
                  onChange={(v) => setForm((prev) => ({ ...prev, indicatorId: v, currentProgress: v ? '' : prev.currentProgress }))}
                  options={[
                    { value: '', label: 'No linked indicator (manual progress entry)' },
                    ...indicators.map((ind) => ({ value: ind.id, label: ind.name, hint: ind.unit })),
                  ]}
                />
                {form.indicatorId && (
                  <p className="text-[10px] text-navy-400">
                    Progress will be calculated automatically from this indicator's recorded values at the baseline and target years, once enough data is logged.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={closeModal}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" icon={<Check className="w-4 h-4" />}>
                  {editingTargetId ? 'Save Changes' : 'Create Target'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
