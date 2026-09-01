/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Download,
  Compass,
  Activity,
  FileText,
  Search,
  Clock,
  Target,
  ClipboardCheck,
  Globe,
  ShieldCheck
} from 'lucide-react';
import Card from './ui/Card';
import GettingStartedCard, { GettingStartedStep } from './GettingStartedCard';
import { useApplicableMatters } from '../hooks/useApplicableMatters';
import { indicatorsApi, IndicatorResponse } from '../api/indicatorsApi';
import { exportApi, downloadCsv, ExportHistoryResponse } from '../api/exportApi';
import { targetsApi, PerformanceTargetResponse } from '../api/targetsApi';
import { computeTargetStatus, TARGET_STATUS_STYLES, TargetStatus } from '../utils/targetStatus';
import { materialityApi, AssessmentSummaryResponse } from '../api/materialityApi';
import { governanceApi, MatterOwnershipResponse } from '../api/governanceApi';
import { compliancePolicyApi, CompliancePolicyResponse } from '../api/compliancePolicyApi';
import { COMPLIANCE_STATUS_STYLES } from '../utils/complianceStatus';
import { climateApi, EmissionsResponse, IfrsS2Response } from '../api/climateApi';
import { assuranceApi, SignOffResponse, AssuranceLevel } from '../api/assuranceApi';
import { ApiError } from '../api/client';
import { usePlan } from '../contexts/PlanContext';

// Mirrors IndicatorsView's default "Focus Year" — the most recent fiscal year tracked by this app.
const CURRENT_FISCAL_YEAR = 2026;

interface MatterSummary {
  id: string;
  name: string;
  category: 'Environmental' | 'Social' | 'Governance';
  totalIndicators: number;
  completedIndicators: number;
  hasBreach: boolean;
}

interface ActivityItem {
  indicatorId: string;
  indicatorName: string;
  unit: string;
  value: number;
  enteredBy: string;
  enteredAt: string;
  fiscalYear: number;
}

function isBreachingTarget(indicator: IndicatorResponse, currentValue: number): boolean {
  if (indicator.effectiveTarget === null || indicator.effectiveTarget === undefined) return false;
  return indicator.effectiveTargetDirection === 'DOWN'
    ? currentValue > indicator.effectiveTarget
    : currentValue < indicator.effectiveTarget;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function renderEmissionsTrend(emissions: EmissionsResponse) {
  const years = [2023, 2024, 2025, 2026];
  const width = 220;
  const height = 70;
  const barGap = 8;
  const barWidth = (width - barGap * (years.length - 1)) / years.length;

  const points = years.map((y) => {
    const s1 = emissions.scope1.find((v) => v.fiscalYear === y)?.value ?? 0;
    const s2 = emissions.scope2.find((v) => v.fiscalYear === y)?.value ?? 0;
    return s1 + s2;
  });
  const maxVal = Math.max(1, ...points);

  return (
    <svg width={width} height={height + 18} className="mx-auto overflow-visible">
      {points.map((p, idx) => {
        const barHeight = (p / maxVal) * height;
        const x = idx * (barWidth + barGap);
        return (
          <g key={idx}>
            <rect
              x={x} y={height - barHeight} width={barWidth} height={Math.max(barHeight, p > 0 ? 3 : 0)}
              rx={3} fill={p > 0 ? '#6366f1' : '#e5e7eb'}
            />
            <text x={x + barWidth / 2} y={height + 13} fontSize="9" textAnchor="middle" fill="#94a3b8" fontFamily="monospace">
              FY{years[idx]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function renderTrendChart(indicator: IndicatorResponse) {
  const years = [2023, 2024, 2025, 2026];
  const width = 220;
  const height = 70;
  const barGap = 8;
  const barWidth = (width - barGap * (years.length - 1)) / years.length;

  const points = years.map((y) => indicator.values.find((v) => v.fiscalYear === y)?.value ?? null);
  const maxVal = Math.max(1, ...points.filter((p): p is number => p !== null));

  return (
    <svg width={width} height={height + 18} className="mx-auto overflow-visible">
      {points.map((p, idx) => {
        const barHeight = p !== null ? (p / maxVal) * height : 0;
        const x = idx * (barWidth + barGap);
        return (
          <g key={idx}>
            <rect
              x={x} y={height - barHeight} width={barWidth} height={Math.max(barHeight, p !== null ? 3 : 0)}
              rx={3} fill={p !== null ? '#10b981' : '#e5e7eb'}
            />
            <text x={x + barWidth / 2} y={height + 13} fontSize="9" textAnchor="middle" fill="#94a3b8" fontFamily="monospace">
              FY{years[idx]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { matters: applicableMatters } = useApplicableMatters();
  const [indicators, setIndicators] = useState<IndicatorResponse[]>([]);
  const [targets, setTargets] = useState<PerformanceTargetResponse[]>([]);
  const [assessments, setAssessments] = useState<AssessmentSummaryResponse[]>([]);
  const [ownership, setOwnership] = useState<MatterOwnershipResponse[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryResponse[]>([]);
  const [compliancePolicies, setCompliancePolicies] = useState<CompliancePolicyResponse[]>([]);
  const [emissions, setEmissions] = useState<EmissionsResponse | null>(null);
  const [ifrsS2, setIfrsS2] = useState<IfrsS2Response | null>(null);
  const [assuranceCompletion, setAssuranceCompletion] = useState<number | null>(null);
  const [signOff, setSignOff] = useState<SignOffResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const { hasFeature, plan, flagsLoaded } = usePlan();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Complete' | 'In Progress' | 'Needs Attention'>('All');

  useEffect(() => {
    /*
     * Two things this has to get right, and it got both wrong before.
     *
     * Only ask for what the plan includes. Half of these endpoints are gated above the workspace's
     * tier, so on Starter five of them answered 403 every time the dashboard opened — wasted
     * round trips, and a console full of "Access Denied" that buries real errors.
     *
     * And allSettled, not all: Promise.all rejects on the first failure and abandons the rest, so
     * one gated endpoint could stop indicators or materiality — data the reader is entitled to —
     * from ever reaching the screen. Each panel now stands or falls on its own request.
     */
    const requests: Promise<unknown>[] = [
      indicatorsApi.list().then(setIndicators),
      materialityApi.listAssessments().then(setAssessments),
      exportApi.history().then(setExportHistory),
    ];

    if (hasFeature('targets')) {
      requests.push(targetsApi.list().then(setTargets));
    }
    if (hasFeature('governance')) {
      requests.push(governanceApi.getOwnership().then(setOwnership));
      requests.push(compliancePolicyApi.list().then(setCompliancePolicies));
    }
    if (hasFeature('climate-module')) {
      requests.push(climateApi.getEmissions().then(setEmissions));
    }
    if (hasFeature('ifrs-s1-s2')) {
      requests.push(climateApi.getS2().then(setIfrsS2));
    }
    if (hasFeature('assurance-workspace')) {
      requests.push(
        assuranceApi.completion(CURRENT_FISCAL_YEAR).then((r) => setAssuranceCompletion(r.completionPercent)),
        // 404 is the ordinary answer for a year nobody has signed off yet, not a failure.
        assuranceApi.get(CURRENT_FISCAL_YEAR).then(setSignOff).catch((e) => {
          if (!(e instanceof ApiError && e.status === 404)) console.error(e);
          setSignOff(null);
        }),
      );
    }

    Promise.allSettled(requests)
      .then((results) => {
        // A 403 that slips through — a plan downgraded mid-session — is expected and stays quiet.
        // Anything else is worth seeing.
        results.forEach((r) => {
          if (r.status !== 'rejected') return;
          const reason = r.reason;
          if (reason instanceof ApiError && reason.status === 403) return;
          console.error(reason);
        });
      })
      .finally(() => setLoading(false));
    // Re-run when the server's flags land or the plan changes: mounted before either, this effect
    // would otherwise be frozen to the seeded defaults for the life of the screen, and a feature
    // re-tiered by a platform admin would apply everywhere except here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, flagsLoaded]);

  // --- Matter-level summaries, derived from real indicator data ---
  const matterSummaries: MatterSummary[] = applicableMatters
    .map((matter) => {
      const matterIndicators = indicators.filter((i) => i.matterId === matter.id);
      const completedIndicators = matterIndicators.filter((i) =>
        i.values.some((v) => v.fiscalYear === CURRENT_FISCAL_YEAR && v.value !== null)
      ).length;
      const hasBreach = matterIndicators.some((i) => {
        const cur = i.values.find((v) => v.fiscalYear === CURRENT_FISCAL_YEAR)?.value;
        return cur !== null && cur !== undefined && isBreachingTarget(i, cur);
      });
      return {
        id: matter.id,
        name: matter.name,
        category: matter.category,
        totalIndicators: matterIndicators.length,
        completedIndicators,
        hasBreach,
      };
    })
    .filter((m) => m.totalIndicators > 0);

  const totalMatters = matterSummaries.length;
  const completedMatters = matterSummaries.filter((m) => m.completedIndicators === m.totalIndicators).length;
  const inProgressMatters = matterSummaries.filter((m) => m.completedIndicators > 0 && m.completedIndicators < m.totalIndicators).length;
  const needsAttentionMatters = matterSummaries.filter((m) => m.completedIndicators === 0 || m.hasBreach);

  // --- Indicator-level completeness (finer-grained than the matter summary above) ---
  const completedIndicatorCount = indicators.filter((i) =>
    i.values.some((v) => v.fiscalYear === CURRENT_FISCAL_YEAR && v.value !== null)
  ).length;
  const totalIndicatorCount = indicators.length;
  const completenessPercent = totalIndicatorCount > 0 ? Math.round((completedIndicatorCount / totalIndicatorCount) * 100) : 0;

  // --- Recent activity, aggregated across every indicator's real audit trail ---
  const recentActivity: ActivityItem[] = indicators
    .flatMap((i) => i.history.map((h) => ({
      indicatorId: i.id,
      indicatorName: i.name,
      unit: i.unit,
      value: h.value,
      enteredBy: h.enteredBy,
      enteredAt: h.enteredAt,
      fiscalYear: h.fiscalYear,
    })))
    .sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime())
    .slice(0, 8);

  // --- 3-year trend charts for the 2 best-populated indicators (Environmental prioritized) ---
  const trendIndicators = indicators
    .map((i) => ({ indicator: i, populatedYears: i.values.filter((v) => v.value !== null).length }))
    .filter((x) => x.populatedYears >= 2)
    .sort((a, b) => {
      if (a.indicator.category !== b.indicator.category) {
        if (a.indicator.category === 'ENVIRONMENTAL') return -1;
        if (b.indicator.category === 'ENVIRONMENTAL') return 1;
      }
      return b.populatedYears - a.populatedYears;
    })
    .slice(0, 2)
    .map((x) => x.indicator);

  // --- Targets summary, driven by the same glide-path status logic used in TargetsView ---
  const targetStatusCounts: Record<TargetStatus, number> = {
    complete: 0, 'on-track': 0, 'off-track': 0, overdue: 0, 'not-started': 0,
  };
  targets.forEach((t) => { targetStatusCounts[computeTargetStatus(t, CURRENT_FISCAL_YEAR)]++; });

  const upcomingTargets = targets
    .filter((t) => computeTargetStatus(t, CURRENT_FISCAL_YEAR) !== 'complete')
    .sort((a, b) => a.targetYear - b.targetYear)
    .slice(0, 5);

  // --- Reporting readiness, driven by the same real APIs the other tenant views use ---
  const latestAssessment = assessments
    .slice()
    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0];
  const materialityReadiness = !latestAssessment ? 'Not started' : latestAssessment.status === 'VALIDATED' ? 'Validated' : 'Draft';
  const lastExport = exportHistory[0];

  /*
   * A workspace nobody has entered a figure into yet. The four tiles above all read zero for it,
   * and "Nothing needs attention right now" is the worst possible first screen — it says there is
   * nothing to do to someone who has everything to do. Swap them for the checklist until a figure
   * exists, then hand the tiles back.
   *
   * Ticks come off state this component already loads; a step whose feature is above the
   * workspace's plan is left out rather than shown as permanently undone.
   */
  const isNewWorkspace = !loading && completedIndicatorCount === 0 && exportHistory.length === 0;

  const gettingStartedSteps: GettingStartedStep[] = [
    {
      label: 'Complete your materiality assessment',
      hint: 'Decides which indicators you are held to',
      done: materialityReadiness === 'Validated',
      path: '/materiality',
    },
    {
      label: 'Log your first figure',
      hint: 'Upload a bill and accept what it reads, or key it in',
      done: completedIndicatorCount > 0,
      path: '/extraction',
    },
    ...(hasFeature('targets')
      ? [{
          label: 'Set a reduction target',
          hint: 'Progress then calculates itself from your indicators',
          done: targets.length > 0,
          path: '/targets',
        }]
      : []),
    ...(hasFeature('assurance-workspace')
      ? [{
          label: 'Sign off the cycle',
          hint: 'Locks every signed value behind a hash',
          done: signOff !== null,
          path: '/assurance-workspace',
        }]
      : []),
    {
      label: 'Export your disclosure',
      hint: 'Report, raw CSV, or the Bursa CSI file',
      done: exportHistory.length > 0,
      path: '/reports',
    },
  ];

  const sortedCompliancePolicies = compliancePolicies.slice().sort((a, b) => {
    if (!a.nextReviewDueAt && !b.nextReviewDueAt) return 0;
    if (!a.nextReviewDueAt) return -1;
    if (!b.nextReviewDueAt) return 1;
    return new Date(a.nextReviewDueAt).getTime() - new Date(b.nextReviewDueAt).getTime();
  });

  // --- Emissions & IFRS S1/S2 disclosure readiness ---
  const totalEmissionsThisYear = emissions
    ? (emissions.scope1.find((v) => v.fiscalYear === CURRENT_FISCAL_YEAR)?.value ?? 0)
      + (emissions.scope2.find((v) => v.fiscalYear === CURRENT_FISCAL_YEAR)?.value ?? 0)
      + emissions.scope3.reduce((sum, cat) => sum + (cat.values.find((v) => v.fiscalYear === CURRENT_FISCAL_YEAR)?.value ?? 0), 0)
    : 0;

  const pillarsCompleted = ifrsS2
    ? [
        !!ifrsS2.oversightDescription?.trim(),
        !!(ifrsS2.physicalRisks?.trim() || ifrsS2.transitionPlan?.trim() || ifrsS2.climateResilience?.trim()),
        !!ifrsS2.identificationProcess?.trim(),
        !!(ifrsS2.trackedMetrics?.trim() || ifrsS2.reductionTargets?.trim()),
      ].filter(Boolean).length
    : 0;

  // --- Assurance readiness ---
  const ASSURANCE_LEVEL_LABEL: Record<AssuranceLevel, string> = {
    INTERNAL_REVIEW: 'Internal Review',
    EXTERNAL_LIMITED: 'External — Limited',
    EXTERNAL_REASONABLE: 'External — Reasonable'
  };

  const filteredMatters = matterSummaries.filter((m) => {
    if (searchQuery.trim() !== '' && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter === 'Complete') return m.completedIndicators === m.totalIndicators;
    if (statusFilter === 'In Progress') return m.completedIndicators > 0 && m.completedIndicators < m.totalIndicators;
    if (statusFilter === 'Needs Attention') return m.completedIndicators === 0 || m.hasBreach;
    return true;
  });

  const handleExport = () => {
    exportApi.csv(CURRENT_FISCAL_YEAR).then((csv) => {
      downloadCsv(csv, `WeSee_ESG_Dashboard_FY${CURRENT_FISCAL_YEAR}_Export.csv`);
    });
  };

  return (
    <div className="space-y-6 w-full pb-16">

      {/* 1. Dashboard Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time overview of your FY{CURRENT_FISCAL_YEAR} sustainability reporting progress.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-1 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full text-sm font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-semibold shadow-sm transition-colors cursor-pointer border border-transparent"
          >
            <FileText className="w-4 h-4 mr-1" />
            Create Report
          </button>
        </div>
      </div>

      {/* 2. SUMMARY STAT ROW — or, on a workspace with no figures yet, what to do first */}
      {isNewWorkspace ? <GettingStartedCard steps={gettingStartedSteps} /> : (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-600">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-1">Total Matters</p>
              <h3 className="text-gray-900 text-2xl font-bold">{loading ? '—' : totalMatters}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-1 flex items-center">
                Completed <span className="ml-2 text-emerald-500 text-[10px] font-bold bg-emerald-50 px-1.5 py-0.5 rounded">{completenessPercent}% data</span>
              </p>
              <h3 className="text-gray-900 text-2xl font-bold">{loading ? '—' : completedMatters}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-1">In Progress</p>
              <h3 className="text-gray-900 text-2xl font-bold">{loading ? '—' : inProgressMatters}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-1">Needs Attention</p>
              <h3 className="text-gray-900 text-2xl font-bold flex items-baseline">
                {loading ? '—' : needsAttentionMatters.length}
                <span className="text-[10px] text-gray-400 font-medium ml-1">matters</span>
              </h3>
            </div>
          </div>
        </div>

      </div>
      )}

      {/* 3. NEEDS ATTENTION + RECENT ACTIVITY + TARGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-white border-gray-100 p-0 overflow-hidden" padded="none">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold text-gray-900">Needs Attention</h4>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {needsAttentionMatters.length === 0 && !loading && (
              <p className="px-5 py-6 text-xs text-gray-400 text-center">Nothing needs attention right now.</p>
            )}
            {needsAttentionMatters.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate('/indicators')}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer text-left"
              >
                <div>
                  <span className="text-xs font-bold text-gray-900 block">{m.name}</span>
                  <span className="text-[10px] text-gray-500">
                    {m.completedIndicators === 0 ? 'No data logged yet' : m.hasBreach ? 'Target breached' : `${m.completedIndicators}/${m.totalIndicators} logged`}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="bg-white border-gray-100 p-0 overflow-hidden" padded="none">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-primary-500" />
            <h4 className="text-sm font-bold text-gray-900">Recent Activity</h4>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {recentActivity.length === 0 && !loading && (
              <p className="px-5 py-6 text-xs text-gray-400 text-center">No indicator values logged yet.</p>
            )}
            {recentActivity.map((a, idx) => (
              <div key={`${a.indicatorId}-${idx}`} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 truncate pr-2">{a.indicatorName}</span>
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">{new Date(a.enteredAt).toLocaleDateString()}</span>
                </div>
                <span className="text-[11px] text-gray-500">
                  {a.value} {a.unit} (FY{a.fiscalYear}) &middot; logged by <strong className="text-gray-700">{a.enteredBy}</strong>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white border-gray-100 p-0 overflow-hidden" padded="none">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-indigo-500" />
              <h4 className="text-sm font-bold text-gray-900">Targets</h4>
            </div>
            {targets.length > 0 && (
              <span className="text-[10px] text-gray-400 font-mono">{targets.length} total</span>
            )}
          </div>
          {targets.length > 0 && (
            <div className="flex items-center gap-2 px-5 pt-3 flex-wrap">
              {(['on-track', 'off-track', 'overdue'] as TargetStatus[]).map((s) => (
                targetStatusCounts[s] > 0 && (
                  <span key={s} className={`text-[10px] font-bold border rounded-md px-2 py-0.5 ${TARGET_STATUS_STYLES[s].className}`}>
                    {targetStatusCounts[s]} {TARGET_STATUS_STYLES[s].label}
                  </span>
                )
              ))}
            </div>
          )}
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto mt-1">
            {targets.length === 0 && !loading && (
              <p className="px-5 py-6 text-xs text-gray-400 text-center">No targets defined yet.</p>
            )}
            {upcomingTargets.map((t) => {
              const status = computeTargetStatus(t, CURRENT_FISCAL_YEAR);
              return (
                <button
                  key={t.id}
                  onClick={() => navigate('/targets')}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer text-left"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block truncate pr-2">{t.title}</span>
                    <span className="text-[10px] text-gray-500">Target year {t.targetYear}</span>
                  </div>
                  <span className={`text-[10px] font-bold border rounded-md px-2 py-0.5 shrink-0 ${TARGET_STATUS_STYLES[status].className}`}>
                    {TARGET_STATUS_STYLES[status].label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 3b. REPORTING READINESS */}
      <Card className="bg-white border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ClipboardCheck className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-bold text-gray-900">Reporting Readiness</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              completenessPercent === 100
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-100'
            }`}>
              CSI Export {completenessPercent === 100 ? 'Ready' : 'Not Ready'}
            </span>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
            >
              Generate Report <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 font-medium mb-1">Indicators</p>
            <p className="text-sm font-bold text-gray-900">{completenessPercent}% logged</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 font-medium mb-1">Materiality</p>
            <p className="text-sm font-bold text-gray-900">{materialityReadiness}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 font-medium mb-1">Governance</p>
            <p className="text-sm font-bold text-gray-900">{ownership.length} matters assigned</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 font-medium mb-1">Targets</p>
            <p className="text-sm font-bold text-gray-900">{targetStatusCounts['on-track']}/{targets.length} on track</p>
          </div>
        </div>

        <div className="text-xs text-gray-500 border-t border-gray-100 pt-3 pb-3">
          {lastExport
            ? <>Last exported: FY{lastExport.fiscalYear} {lastExport.format} &middot; {timeAgo(lastExport.generatedAt)} by <strong className="text-gray-700">{lastExport.generatedByName ?? 'System'}</strong></>
            : 'No reports generated yet.'}
        </div>

        {sortedCompliancePolicies.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Compliance Calendar</p>
            <div className="divide-y divide-gray-50">
              {sortedCompliancePolicies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate('/governance')}
                  className="w-full flex items-center justify-between py-2 hover:bg-gray-50/50 transition-colors cursor-pointer text-left"
                >
                  <span className="text-xs font-bold text-gray-900 truncate pr-2">{p.name}</span>
                  <span className={`text-[10px] font-bold border rounded-md px-2 py-0.5 shrink-0 ${COMPLIANCE_STATUS_STYLES[p.status].className}`}>
                    {COMPLIANCE_STATUS_STYLES[p.status].label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 3c. EMISSIONS & IFRS S1/S2 DISCLOSURE */}
      <Card className="bg-white border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-bold text-gray-900">Emissions & IFRS Disclosure</h4>
          </div>
          <button
            onClick={() => navigate('/ifrs-s1-s2')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
          >
            View Disclosures <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex gap-6 shrink-0">
            <div>
              <p className="text-[10px] text-gray-500 font-medium mb-1">Total Emissions FY{CURRENT_FISCAL_YEAR}</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(totalEmissionsThisYear).toLocaleString()} <span className="text-xs font-medium text-gray-400">tCO2e</span></p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-medium mb-1">ISSB Pillars Completed</p>
              <p className="text-2xl font-bold text-gray-900">{pillarsCompleted}<span className="text-xs font-medium text-gray-400">/4</span></p>
            </div>
          </div>
          {emissions && (
            <div className="flex-1 flex justify-center">
              {renderEmissionsTrend(emissions)}
            </div>
          )}
        </div>
      </Card>

      {/* 3d. ASSURANCE READINESS */}
      <Card className="bg-white border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-gray-900">Assurance Readiness</h4>
          </div>
          <button
            onClick={() => navigate('/assurance-workspace')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
          >
            View Workspace <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] text-gray-500 font-medium mb-1">FY{CURRENT_FISCAL_YEAR} Completion</p>
            <p className="text-2xl font-bold text-gray-900">{assuranceCompletion ?? '—'}<span className="text-xs font-medium text-gray-400">%</span></p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-medium mb-1">Sign-off Status</p>
            <p className="text-sm font-bold text-gray-900">
              {signOff
                ? <span className="text-emerald-700">{ASSURANCE_LEVEL_LABEL[signOff.assuranceLevel]}</span>
                : <span className="text-gray-400">Unsigned</span>}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-medium mb-1">Next Mandatory External Assurance</p>
            <p className="text-sm font-bold text-gray-900">
              {signOff?.nextExternalAssuranceDeadline
                ? new Date(signOff.nextExternalAssuranceDeadline).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
                : <span className="text-gray-400">Not yet mandated for your market tier</span>}
            </p>
          </div>
        </div>
      </Card>

      {/* 4. TREND CHARTS */}
      {trendIndicators.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {trendIndicators.map((ind) => (
            <Card key={ind.id} className="bg-white border-gray-100 p-5">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold text-gray-900">{ind.name}</h4>
                <span className="text-[9px] text-gray-400 font-mono">({ind.unit})</span>
              </div>
              {renderTrendChart(ind)}
            </Card>
          ))}
        </div>
      )}

      {/* 5. Matters List */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden flex flex-col mt-4">

        {/* Table Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by matter name..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-full text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-50 rounded-full p-1 border border-gray-100">
              {(['All', 'Complete', 'In Progress', 'Needs Attention'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-4 py-1 text-xs font-bold rounded-full cursor-pointer transition-colors ${
                    statusFilter === f ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-900 font-semibold'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4 font-semibold">Matter</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Progress</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-xs text-gray-400 font-medium">Loading…</td></tr>
              )}
              {!loading && filteredMatters.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-xs text-gray-400 font-medium">No matters match this filter.</td></tr>
              )}
              {filteredMatters.map((m) => {
                const progress = m.totalIndicators > 0 ? Math.round((m.completedIndicators / m.totalIndicators) * 100) : 0;
                const isComplete = m.completedIndicators === m.totalIndicators;
                const isEmpty = m.completedIndicators === 0;

                return (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors group">

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                          m.category === 'Environmental' ? 'bg-emerald-500' :
                          m.category === 'Social' ? 'bg-blue-500' :
                          'bg-purple-500'
                        }`}>
                          {m.category.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900 block">{m.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-500">
                      {m.category}
                    </td>

                    <td className="px-6 py-4 max-w-[140px] md:w-[180px]">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-amber-400'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 shrink-0">{m.completedIndicators}/{m.totalIndicators}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        isComplete ? 'bg-emerald-50 text-emerald-700' :
                        m.hasBreach || isEmpty ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          isComplete ? 'bg-emerald-500' :
                          m.hasBreach || isEmpty ? 'bg-red-500' :
                          'bg-amber-500'
                        }`} />
                        {isComplete ? 'Done' : m.hasBreach ? 'Target breached' : isEmpty ? 'Not started' : 'Pending'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate('/indicators')}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
