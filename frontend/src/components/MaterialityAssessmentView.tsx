/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
  Sliders,
  Info,
  Calendar,
  Download,
  Layers,
  Users,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileText,
  Building,
  Target,
  ArrowRight,
  TrendingUp,
  History
} from 'lucide-react';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { canAccess, MANAGEMENT_ROLES } from '../permissions';
import Button from './ui/Button';
import Card from './ui/Card';
import { useApplicableMatters, SustainabilityMatter } from '../hooks/useApplicableMatters';
import { materialityApi, StakeholderOptionResponse, AssessmentSummaryResponse, AssessmentDetailResponse } from '../api/materialityApi';
import DraftWithAiButton from './ai/DraftWithAiButton';

export type { SustainabilityMatter };

interface StakeholderOption {
  id: string;
  name: string;
  selected: boolean;
  isCustom: boolean;
}

interface ScoreState {
  impact: number;
  influence: number;
  rationale?: string;
}

/** Both scores are 1-5 ints, so "high priority" is exactly impact>=4 AND influence>=4 — mirrors the backend's ScoreResponse.priorityTier(). */
function isHighPriority(impact: number, influence: number): boolean {
  return impact >= 4 && influence >= 4;
}

function fromStakeholderResponse(o: StakeholderOptionResponse): StakeholderOption {
  return { id: o.id, name: o.name, selected: o.selected, isCustom: o.custom };
}

const PRIORITY_STYLES: Record<string, { color: string; bgLight: string }> = {
  'High Priority': { color: 'bg-rose-500', bgLight: 'bg-rose-50 text-rose-700 border-rose-100' },
  'Medium Priority': { color: 'bg-amber-500', bgLight: 'bg-amber-50 text-amber-700 border-amber-100' },
  'Low Priority': { color: 'bg-slate-400', bgLight: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export default function MaterialityAssessmentView() {
  const { plan } = usePlan();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { matters: activeMatters, loading: mattersLoading } = useApplicableMatters();

  // 1. Navigation state
  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // 2. Step 1: Stakeholder Mapping state — backed by the real stakeholder-options API
  const [stakeholders, setStakeholders] = useState<StakeholderOption[]>([]);
  const [customStakeholder, setCustomStakeholder] = useState('');

  useEffect(() => {
    materialityApi.stakeholderOptions().then((data) => setStakeholders(data.map(fromStakeholderResponse)));
  }, []);

  // Active selected matter index for the scoring interface
  const [activeMatterIndex, setActiveMatterIndex] = useState(0);

  // 3. Scores state (1-5 range for both business impact and stakeholder influence)
  const [scores, setScores] = useState<Record<string, ScoreState>>({});

  // Initialize scores when the applicable matters list loads or changes
  useEffect(() => {
    if (activeMatters.length === 0) return;
    setScores((prev) => {
      const initialScores: Record<string, ScoreState> = {};
      activeMatters.forEach((matter) => {
        initialScores[matter.id] = prev[matter.id] || { impact: 3, influence: 3, rationale: '' };
      });
      return initialScores;
    });
  }, [activeMatters]);

  const setScoreValue = (matterId: string, type: 'impact' | 'influence', val: number) => {
    setScores((prev) => ({
      ...prev,
      [matterId]: {
        ...prev[matterId],
        [type]: val
      }
    }));
  };

  const setScoreRationale = (matterId: string, rationale: string) => {
    setScores((prev) => ({
      ...prev,
      [matterId]: {
        ...prev[matterId],
        rationale
      }
    }));
  };

  // 4. Historical snapshots — backed by the real assessments API
  const [savedAssessments, setSavedAssessments] = useState<AssessmentSummaryResponse[]>([]);
  const [selectedHistoryAssessment, setSelectedHistoryAssessment] = useState<AssessmentDetailResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const refreshAssessments = () => {
    materialityApi.listAssessments().then(setSavedAssessments);
  };

  useEffect(() => {
    refreshAssessments();
  }, []);

  const handleSelectHistoryAssessment = (id: string) => {
    materialityApi.getAssessment(id).then(setSelectedHistoryAssessment);
  };

  const handleDownloadReport = (id: string, name: string) => {
    setIsDownloadingReport(true);
    materialityApi.downloadReport(id)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WeSee_Materiality_Report_${name.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => showToast('Failed to generate the materiality report PDF. Please try again.', 'error'))
      .finally(() => setIsDownloadingReport(false));
  };

  const handleValidateAssessment = (id: string) => {
    setIsValidating(true);
    materialityApi.validateAssessment(id)
      .then((updated) => {
        setSelectedHistoryAssessment(updated);
        refreshAssessments();
      })
      .finally(() => setIsValidating(false));
  };

  // 5. Dynamic priority calculations (mirrors the backend's priorityTier computation for the live wizard)
  const getPriorityInfo = (impact: number, influence: number) => {
    const average = (impact + influence) / 2;
    const label = isHighPriority(impact, influence) ? 'High Priority' : average >= 3.0 ? 'Medium Priority' : 'Low Priority';
    return { label, ...PRIORITY_STYLES[label] };
  };

  // Stakeholder helper actions
  const toggleStakeholder = (id: string) => {
    const target = stakeholders.find((s) => s.id === id);
    if (!target) return;
    setStakeholders((prev) => prev.map((sh) => (sh.id === id ? { ...sh, selected: !sh.selected } : sh)));
    materialityApi.toggleStakeholder(id, !target.selected).catch(() => {
      // revert on failure
      setStakeholders((prev) => prev.map((sh) => (sh.id === id ? { ...sh, selected: target.selected } : sh)));
    });
  };

  const handleAddCustomStakeholder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStakeholder.trim()) return;
    const name = customStakeholder.trim();
    setCustomStakeholder('');
    materialityApi.addStakeholder(name).then((created) => {
      setStakeholders((prev) => [...prev, fromStakeholderResponse(created)]);
    });
  };

  const handleDeleteStakeholder = (id: string) => {
    setStakeholders((prev) => prev.filter((sh) => sh.id !== id));
    materialityApi.deleteStakeholder(id).catch(() => refreshStakeholdersOnError());
  };

  const refreshStakeholdersOnError = () => {
    materialityApi.stakeholderOptions().then((data) => setStakeholders(data.map(fromStakeholderResponse)));
  };

  const toggleSelectAllStakeholders = (select: boolean) => {
    setStakeholders((prev) => prev.map((sh) => ({ ...sh, selected: select })));
    Promise.all(stakeholders.map((sh) => materialityApi.toggleStakeholder(sh.id, select))).catch(() => refreshStakeholdersOnError());
  };

  // Save functionality
  const handleSaveAssessment = async () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const nameStr = `Materiality Assessment Snapshot (${dateStr})`;
    const selectedNames = stakeholders.filter((s) => s.selected).map((s) => s.name);

    setIsSaving(true);
    try {
      const detail = await materialityApi.createAssessment({
        name: nameStr,
        assessmentDate: dateStr,
        scores: activeMatters.map((m) => ({
          matterId: m.id,
          impact: scores[m.id]?.impact ?? 3,
          influence: scores[m.id]?.influence ?? 3,
          rationale: scores[m.id]?.rationale || undefined
        })),
        stakeholderNames: selectedNames.length > 0 ? selectedNames : undefined
      });

      refreshAssessments();
      showToast('Materiality assessment baseline snapshot saved successfully.', 'success');

      setActiveTab('history');
      setSelectedHistoryAssessment(detail);
      setCurrentStep(1);
      setActiveMatterIndex(0);
    } finally {
      setIsSaving(false);
    }
  };

  // Render SVG Matrix
  const renderMatrixSVG = (currentScores: Record<string, ScoreState>, mattersList: { id: string; name: string; category: string }[], isReadOnly = false) => {
    const width = 500;
    const height = 500;
    const padding = 60;

    // Convert score (1 to 5) to coordinates
    const getX = (val: number) => padding + ((val - 1) / 4) * (width - 2 * padding);
    const getY = (val: number) => height - padding - ((val - 1) / 4) * (height - 2 * padding);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-white rounded-2xl border border-navy-100/50 shadow-inner">
        {/* Gradients */}
        <defs>
          <linearGradient id="high-quadrant" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE4E6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFE4E6" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="low-quadrant" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Quadrant backgrounds */}
        <rect x={getX(3.5)} y={getY(5)} width={getX(5) - getX(3.5)} height={getY(3.5) - getY(5)} fill="url(#high-quadrant)" />
        <line x1={getX(3.5)} y1={getY(5)} x2={getX(3.5)} y2={getY(1)} stroke="#FDA4AF" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1={getX(1)} y1={getY(3.5)} x2={getX(5)} y2={getY(3.5)} stroke="#FDA4AF" strokeWidth="1.5" strokeDasharray="4 4" />

        {/* Quadrant Labels */}
        <text x={getX(4.3)} y={getY(4.7)} fill="#E11D48" fontSize="10" fontWeight="bold" textAnchor="middle" opacity="0.8">
          HIGH PRIORITY
        </text>
        <text x={getX(1.8)} y={getY(4.7)} fill="#475569" fontSize="9" fontWeight="semibold" textAnchor="middle" opacity="0.6">
          IMPACT FOCUS
        </text>
        <text x={getX(4.3)} y={getY(1.8)} fill="#475569" fontSize="9" fontWeight="semibold" textAnchor="middle" opacity="0.6">
          FINANCIAL FOCUS
        </text>
        <text x={getX(1.8)} y={getY(1.8)} fill="#94A3B8" fontSize="9" fontWeight="semibold" textAnchor="middle" opacity="0.6">
          LOW PRIORITY
        </text>

        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map((val) => {
          const x = getX(val);
          const y = getY(val);
          return (
            <React.Fragment key={val}>
              <line x1={x} y1={getY(1)} x2={x} y2={getY(5)} stroke="#E2E8F0" strokeWidth="0.5" />
              <line x1={getX(1)} y1={y} x2={getX(5)} y2={y} stroke="#E2E8F0" strokeWidth="0.5" />
              <text x={x} y={height - padding + 18} fill="#64748B" fontSize="9" fontWeight="bold" textAnchor="middle" className="font-mono">
                {val}
              </text>
              <text x={padding - 15} y={y + 3} fill="#64748B" fontSize="9" fontWeight="bold" textAnchor="end" className="font-mono">
                {val}
              </text>
            </React.Fragment>
          );
        })}

        {/* Axes lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#475569" strokeWidth="2" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#475569" strokeWidth="2" />

        {/* Axis Labels */}
        <text x={width / 2} y={height - 15} fill="#1E293B" fontSize="11" fontWeight="bold" textAnchor="middle">
          Financial Materiality (Effect on the Business) →
        </text>
        <text x={15} y={height / 2} fill="#1E293B" fontSize="11" fontWeight="bold" textAnchor="middle" transform={`rotate(-90 15 ${height / 2})`}>
          Impact Materiality (Effect on Economy, Environment & People) →
        </text>

        {/* Plotted Dots */}
        {mattersList.map((matter, index) => {
          const mScore = currentScores[matter.id] || { impact: 3, influence: 3 };
          const cx = getX(mScore.impact);
          const cy = getY(mScore.influence);
          const pInfo = getPriorityInfo(mScore.impact, mScore.influence);
          // Read-only mode receives mattersList pre-sorted by rank, so a plain index+1 lines up
          // exactly with the Priority Rankings table's "#N" column — the legend depends on this.
          const labelAbbr = isReadOnly ? `${index + 1}` : `${matter.category[0]}${index + 1}`;

          return (
            <g key={matter.id} className="cursor-pointer group">
              <circle
                cx={cx}
                cy={cy}
                r="8"
                className={`${pInfo.color} transition-all duration-300 stroke-white`}
                strokeWidth="1.5"
              >
                <title>{`${matter.name}: (${mScore.impact}, ${mScore.influence})`}</title>
              </circle>
              <text x={cx} y={cy + 2.5} fill="#FFF" fontSize="6.5" fontWeight="bold" textAnchor="middle" className="pointer-events-none">
                {labelAbbr}
              </text>
              {/* Read-only snapshots render many points that often share coordinates — an inline name
                  label per dot overlaps illegibly, so history view relies on hover + the ranked table
                  instead (see MaterialityAssessmentView's history detail panel). */}
              {!isReadOnly && (
                <text x={cx + 12} y={cy + 3} fill="#0F172A" fontSize="8.5" fontWeight="semibold" className="group-hover:font-extrabold transition-all">
                  {matter.name.length > 25 ? `${matter.name.substring(0, 22)}...` : matter.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-8 w-full pb-16 font-sans">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-navy-100/40">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-primary-600 mb-1">
            <span className="px-2 py-0.5 bg-primary-50 rounded-md">Stakeholder Inquiries</span>
            <span>•</span>
            <span>Double Materiality Guidelines</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-950">
            ESG Materiality Assessment
          </h2>
          <p className="text-xs text-navy-500 mt-1">
            Map key corporate stakeholder concerns and rate ESG impacts to prioritize listing disclosures.
          </p>
        </div>

        <div className="flex bg-navy-100/50 p-1 rounded-xl border border-navy-200/40 shrink-0">
          <button
            onClick={() => {
              setActiveTab('wizard');
              setSelectedHistoryAssessment(null);
            }}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'wizard' && !selectedHistoryAssessment
                ? 'bg-white text-navy-950 shadow-sm'
                : 'text-navy-500 hover:text-navy-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Assessment Wizard</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'history' || selectedHistoryAssessment
                ? 'bg-white text-navy-950 shadow-sm'
                : 'text-navy-500 hover:text-navy-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Assessment History ({savedAssessments.length})</span>
          </button>
        </div>
      </div>

      {/* ==============================================
          HISTORY MODE (READ-ONLY VIEWS)
         ============================================== */}
      {(activeTab === 'history' || selectedHistoryAssessment) && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Snapshots Index (Left rail) — a ledger-style timeline, newest first */}
            <div className="lg:col-span-3 space-y-5">
              <h3 className="text-[10px] font-extrabold text-navy-400 uppercase tracking-widest block ml-0.5">Saved Snapshots</h3>

              {savedAssessments.length > 0 && (
                <div className="relative pl-0.5">
                  <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-navy-100" aria-hidden="true" />
                  <div>
                    {savedAssessments.map((asmt) => {
                      const isSelected = selectedHistoryAssessment?.id === asmt.id;
                      return (
                        <button
                          key={asmt.id}
                          onClick={() => handleSelectHistoryAssessment(asmt.id)}
                          title={asmt.name}
                          className={`relative w-full text-left flex items-start gap-3.5 py-2.5 pr-2 -ml-2 pl-2 cursor-pointer group rounded-xl transition-colors ${
                            isSelected ? 'bg-primary-50/60' : 'hover:bg-navy-50/60'
                          }`}
                        >
                          <span
                            className={`relative z-10 mt-1 w-[11px] h-[11px] rounded-full border-2 shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-primary-600 border-primary-600'
                                : asmt.status === 'VALIDATED'
                                  ? 'bg-white border-emerald-500'
                                  : 'bg-white border-amber-500'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`text-[10px] font-bold font-mono ${isSelected ? 'text-primary-700' : 'text-navy-400'}`}>
                              {asmt.assessmentDate}
                            </div>
                            <div className="text-xs font-bold text-navy-950 leading-snug line-clamp-2 mt-0.5">{asmt.name}</div>
                            {asmt.createdByName && (
                              <span className="text-[10px] text-navy-400 block mt-0.5">Captured by {asmt.createdByName}</span>
                            )}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded-full border border-navy-100 text-navy-500 uppercase">
                                {asmt.planAtCapture === 'ISSUER_READY' ? `Bursa ${asmt.marketAtCapture === 'ACE_MARKET' ? 'ACE' : 'Main'}` : 'SEDG CORE'}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                asmt.status === 'VALIDATED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                                {asmt.status === 'VALIDATED' ? 'Validated' : 'Draft'}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {savedAssessments.length === 0 && (
                <div className="text-center py-8 bg-white border border-navy-100/50 rounded-2xl text-xs text-navy-400">
                  No assessments saved yet. Complete the wizard to generate your first baseline snapshot.
                </div>
              )}

              <div className="bg-gradient-to-br from-primary-50/60 to-emerald-50/40 border border-primary-100/50 rounded-2xl p-4 space-y-2.5">
                <Sparkles className="w-4 h-4 text-primary-600" />
                <h4 className="text-xs font-bold text-navy-950">Conduct fresh audit</h4>
                <p className="text-[11px] text-navy-500 leading-relaxed">
                  Start the guided wizard to update disclosure scores and record a new compliant version.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('wizard');
                    setSelectedHistoryAssessment(null);
                    setCurrentStep(1);
                  }}
                  className="text-xs text-primary-700 hover:text-primary-900 font-bold flex items-center cursor-pointer pt-1"
                >
                  <span>Launch Wizard</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </div>

            {/* Snapshot Detailed Read-Only Display (Right) */}
            <div className="lg:col-span-9">
              {selectedHistoryAssessment ? (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-white border-navy-100/80 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-primary-600 uppercase tracking-widest block font-mono">Read-Only Snapshot Archive</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            selectedHistoryAssessment.status === 'VALIDATED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {selectedHistoryAssessment.status === 'VALIDATED' ? 'Validated' : 'Draft'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-navy-950 mt-1">{selectedHistoryAssessment.name}</h3>
                        <div className="flex items-center space-x-2 text-xs text-navy-500 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Saved on {selectedHistoryAssessment.assessmentDate}</span>
                          <span>•</span>
                          <span>Workspace plan at capture: <strong className="uppercase">{selectedHistoryAssessment.planAtCapture}</strong></span>
                        </div>
                        {selectedHistoryAssessment.status === 'VALIDATED' && (
                          <p className="text-[10px] text-emerald-700 mt-1">
                            Validated by <strong>{selectedHistoryAssessment.validatedByName}</strong>
                            {selectedHistoryAssessment.validatedAt && ` on ${new Date(selectedHistoryAssessment.validatedAt).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {selectedHistoryAssessment.status === 'DRAFT' && canAccess(user?.role, MANAGEMENT_ROLES) && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleValidateAssessment(selectedHistoryAssessment.id)}
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            disabled={isValidating}
                          >
                            {isValidating ? 'Validating…' : 'Validate Assessment'}
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownloadReport(selectedHistoryAssessment.id, selectedHistoryAssessment.name)}
                          icon={<Download className="w-3.5 h-3.5" />}
                          disabled={isDownloadingReport}
                        >
                          {isDownloadingReport ? 'Generating…' : 'Download PDF Report'}
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-navy-100/50 pt-4 mt-4 space-y-2">
                      <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block">Assessed Corporate Stakeholders</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedHistoryAssessment.stakeholders.map((shName, sIdx) => (
                          <span key={sIdx} className="text-[10px] bg-navy-50 border border-navy-100/60 px-2.5 py-1 rounded-full text-navy-700 font-semibold">
                            {shName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {(() => {
                    const rankedScores = [...selectedHistoryAssessment.scores]
                      .sort((a, b) => (b.impact + b.influence) - (a.impact + a.influence));
                    const highPriority = rankedScores.filter((s) => isHighPriority(s.impact, s.influence));
                    const otherCount = rankedScores.length - highPriority.length;

                    return (
                      <div className="space-y-6">
                        <Card className="bg-white border-navy-100 p-6">
                          <div className="flex flex-wrap justify-between items-start gap-5 mb-5">
                            <div>
                              <h4 className="text-sm font-bold text-navy-950">Double Materiality Grid</h4>
                              <p className="text-xs text-navy-400 mt-0.5">Financial materiality × impact materiality — plotted from archived scores.</p>
                            </div>
                            <div className="flex items-center gap-5 shrink-0">
                              <div className="text-right">
                                <div className="text-lg font-extrabold text-rose-600 leading-none">{highPriority.length}</div>
                                <div className="text-[9px] font-bold text-navy-400 uppercase tracking-wider mt-1.5">High Priority</div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-extrabold text-navy-900 leading-none">{otherCount}</div>
                                <div className="text-[9px] font-bold text-navy-400 uppercase tracking-wider mt-1.5">Other</div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-extrabold text-navy-900 leading-none">{rankedScores.length}</div>
                                <div className="text-[9px] font-bold text-navy-400 uppercase tracking-wider mt-1.5">Total Matters</div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-7 items-center">
                            <div>
                              {renderMatrixSVG(
                                Object.fromEntries(rankedScores.map((s) => [s.matterId, { impact: s.impact, influence: s.influence }])),
                                rankedScores.map((s) => ({ id: s.matterId, name: s.matterName, category: s.category[0] })),
                                true
                              )}
                            </div>
                            <div className="space-y-3">
                              {highPriority.map((s) => (
                                <div key={s.matterId} className="flex items-start gap-2.5">
                                  <span className="w-2 h-2 rounded-full bg-rose-600 mt-1 shrink-0" />
                                  <span className="text-[11px] text-navy-600 leading-snug">
                                    <strong className="text-navy-900 font-bold">#{rankedScores.indexOf(s) + 1}</strong> {s.matterName}
                                  </span>
                                </div>
                              ))}
                              {otherCount > 0 && (
                                <div className="flex items-start gap-2.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                                  <span className="text-[11px] text-navy-500 leading-snug">
                                    {otherCount} other matter{otherCount !== 1 ? 's' : ''} scored Medium or Low — see the ranked table below.
                                  </span>
                                </div>
                              )}
                              <p className="text-[10px] text-navy-400 pt-2.5 border-t border-navy-50">Numbers on the chart match the Rank column below.</p>
                            </div>
                          </div>
                        </Card>

                        <Card className="bg-white border-navy-100 p-0 overflow-hidden min-w-0" padded="none">
                          <div className="p-5 border-b border-navy-50">
                            <h4 className="text-sm font-bold text-navy-950">Priority Rankings</h4>
                            <p className="text-xs text-navy-400 mt-0.5">Scored matters ordered by total combined score.</p>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-navy-100 bg-navy-50/50 text-[10px] text-navy-400 uppercase tracking-wider font-mono">
                                  <th className="px-5 py-3 font-bold">Rank</th>
                                  <th className="px-5 py-3 font-bold">Matter</th>
                                  <th className="px-5 py-3 font-bold text-center whitespace-nowrap">Financial</th>
                                  <th className="px-5 py-3 font-bold text-center whitespace-nowrap">Impact</th>
                                  <th className="px-5 py-3 font-bold whitespace-nowrap">Tier</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-navy-50 text-xs">
                                {rankedScores.map((s, idx) => (
                                  <tr key={s.matterId} className="hover:bg-navy-50/20">
                                    <td className="relative px-5 py-4 font-mono font-bold text-navy-500 text-center">
                                      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${PRIORITY_STYLES[s.priorityTier]?.color ?? 'bg-navy-200'}`} />
                                      #{idx + 1}
                                    </td>
                                    <td className="px-5 py-4 max-w-md">
                                      <span className="font-bold text-navy-900 block leading-tight">{s.matterName}</span>
                                      <span className="text-[9px] text-navy-400 font-bold block mt-0.5 uppercase tracking-wider">{s.category}</span>
                                      {s.rationale && (
                                        <span className="text-[10px] text-navy-500 italic block mt-1.5 leading-snug">{s.rationale}</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-4 text-center font-mono font-bold text-navy-700">{s.impact}</td>
                                    <td className="px-5 py-4 text-center font-mono font-bold text-navy-700">{s.influence}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${PRIORITY_STYLES[s.priorityTier]?.bgLight ?? ''}`}>
                                        {s.priorityTier.split(' ')[0]}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed border-navy-200 rounded-3xl text-center min-h-[400px]">
                  <FileText className="w-12 h-12 text-navy-300 mb-4 animate-pulse" />
                  <h3 className="text-sm font-extrabold text-navy-950">Select Snapshot</h3>
                  <p className="text-xs text-navy-400 max-w-xs mt-1">
                    Choose one of the saved materiality baselines from the sidebar to review its read-only coordinates, stakeholders, and priority indices.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================
          WIZARD WORKSPACE FLOW (INTERACTIVE FORM)
         ============================================== */}
      {activeTab === 'wizard' && !selectedHistoryAssessment && (
        <div className="space-y-8">
          {/* STEP-INDICATOR HEADER */}
          <div className="w-full bg-white border border-navy-100/60 rounded-3xl p-6 shadow-sm">
            <div className="max-w-3xl mx-auto">
              {/* items-start, and the track inset to the first and last circle centres: the labels
                  used to be absolutely positioned and nowrap, so the outer two hung past the card
                  on every width under about 1200px and added no height for themselves. They are in
                  the flow now, inside fixed-width columns they can wrap within. */}
              <div className="relative flex items-start justify-between">
                <div className="absolute left-12 right-12 top-5 h-0.5 bg-navy-100 -z-10">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                  />
                </div>

                {[
                  { step: 1, label: 'Stakeholder Map' },
                  { step: 2, label: 'Matter Scoring' },
                  { step: 3, label: 'Matrix Analysis' },
                  { step: 4, label: 'Summary & Capture' }
                ].map((s) => {
                  const isActive = currentStep === s.step;
                  const isCompleted = currentStep > s.step;

                  return (
                    <div key={s.step} className="flex flex-col items-center w-24">
                      <button
                        onClick={() => {
                          if (isCompleted || s.step < currentStep) {
                            setCurrentStep(s.step);
                          }
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 z-10 cursor-pointer ${
                          isActive
                            ? 'bg-primary-500 border-primary-500 text-white font-black ring-4 ring-primary-500/10'
                            : isCompleted
                              ? 'bg-emerald-600 border-emerald-600 text-white font-black'
                              : 'bg-white border-navy-200 text-navy-400 font-semibold hover:border-navy-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5 text-white" /> : <span className="text-xs font-mono">{s.step}</span>}
                      </button>

                      <span
                        className={`text-[10px] mt-2.5 font-bold uppercase tracking-wider text-center leading-tight ${
                          isActive ? 'text-primary-600 font-black' : isCompleted ? 'text-emerald-700' : 'text-navy-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="h-4" />
          </div>

          <div className="mt-8">
            {/* ========================================================
                STEP 1: STAKEHOLDER MAPPING
               ======================================================== */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-1 bg-primary-50 rounded-xl inline-block border border-primary-100">
                    <Users className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-bold text-navy-950">Stakeholder Scope</h3>
                  <p className="text-xs text-navy-500 leading-relaxed">
                    Under standard Malaysian SEDG and CSRD guidelines, materiality requires mapping the interests of core stakeholder circles.
                  </p>
                  <p className="text-xs text-navy-500 leading-relaxed">
                    Identify all stakeholder groups relevant to your company's operations. Consulting these groups is how you evidence the Impact Materiality rating you assign in Step 2 — the effect your company has on the economy, environment, and people, as they experience it.
                  </p>

                  <div className="bg-navy-50/50 rounded-2xl p-4.5 border border-navy-100/50">
                    <span className="text-[9px] font-bold text-navy-400 uppercase tracking-widest block font-mono">Malaysian Standard</span>
                    <p className="text-[11px] text-navy-600 mt-1 leading-normal">
                      The Capital Markets Malaysia guidelines emphasize selecting at least Employees, Customers, and Regulators to satisfy standard domestic compliance indicators.
                    </p>
                  </div>
                </div>

                <Card className="lg:col-span-8 bg-white border-navy-100/80">
                  <div>
                    <h4 className="text-sm font-bold text-navy-950">Select Corporate Stakeholder Groups</h4>
                    <p className="text-xs text-navy-400 mt-0.5">Toggle standard groups or introduce your custom categories.</p>
                  </div>

                  <div className="space-y-3 mt-6">
                    <div className="flex items-center justify-between text-xs font-semibold text-navy-500">
                      <span>Standard Stakeholders</span>
                      <div className="space-x-3">
                        <button type="button" onClick={() => toggleSelectAllStakeholders(true)} className="text-primary-600 hover:text-primary-800 font-bold cursor-pointer">Select All</button>
                        <span>•</span>
                        <button type="button" onClick={() => toggleSelectAllStakeholders(false)} className="text-navy-400 hover:text-navy-600 cursor-pointer">Clear All</button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {stakeholders.map((sh) => (
                        <div key={sh.id} className="relative group">
                          <button
                            type="button"
                            onClick={() => toggleStakeholder(sh.id)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1.5 cursor-pointer ${
                              sh.selected
                                ? 'bg-primary-50 border-primary-500 text-primary-950 font-extrabold shadow-sm ring-1 ring-primary-500/10'
                                : 'bg-white border-navy-100 text-navy-600 hover:border-navy-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${sh.selected ? 'bg-primary-500' : 'bg-slate-300'}`} />
                            <span>{sh.name}</span>
                          </button>

                          {sh.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStakeholder(sh.id)}
                              className="absolute -top-1.5 -right-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-full p-1 border border-rose-200 hover:text-rose-800 transition-colors cursor-pointer"
                              title="Remove stakeholder"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleAddCustomStakeholder} className="pt-4 border-t border-navy-50 space-y-2">
                    <label className="text-xs font-bold text-navy-950 block">Add Custom Stakeholder Circle</label>
                    <div className="flex max-w-md items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Academic Partners, Industry Coalitions..."
                        value={customStakeholder}
                        onChange={(e) => setCustomStakeholder(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs text-navy-800 bg-navy-50/50 border border-navy-100 hover:bg-navy-50 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all font-sans"
                      />
                      <Button variant="secondary" size="sm" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>
                        Add Circle
                      </Button>
                    </div>
                  </form>

                  <div className="pt-6 border-t border-navy-100 flex justify-end">
                    <Button
                      variant="primary"
                      onClick={() => setCurrentStep(2)}
                      icon={<ChevronRight className="w-4 h-4" />}
                      iconPosition="right"
                      disabled={stakeholders.filter((s) => s.selected).length === 0}
                    >
                      Continue to Scoring
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* ========================================================
                STEP 2: SUSTAINABILITY MATTER SCORING
               ======================================================== */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
                <div className="lg:col-span-4 space-y-4">
                  <Card className="bg-white border-navy-100/50 p-4 space-y-1.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono border ${
                      plan === 'issuer-ready' ? 'text-purple-600 bg-purple-50 border-purple-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                    }`}>
                      {plan === 'issuer-ready' ? 'Bursa Malaysia Integration' : 'SEDG Standard Baseline'}
                    </span>
                    <h4 className="text-xs font-bold text-navy-950">
                      {plan === 'issuer-ready' ? 'Listed Issuer Common Matters' : 'SME Simplified Guidelines'}
                    </h4>
                    <p className="text-[10px] text-navy-400 leading-normal">
                      {plan === 'issuer-ready'
                        ? `${activeMatters.length} common sustainability matters applicable to your onboarded market classification.`
                        : `${activeMatters.length} core disclosures representing the basic ESG guidelines tailored specifically for micro, small, and medium businesses in Malaysia.`}
                    </p>
                  </Card>

                  <div className="bg-white border border-navy-100/60 rounded-2xl overflow-hidden shadow-subtle p-4 space-y-2">
                    <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block mb-2 px-1">Scope Indicators</span>

                    <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                      {activeMatters.map((matter, idx) => {
                        const isActive = idx === activeMatterIndex;
                        return (
                          <button
                            key={matter.id}
                            type="button"
                            onClick={() => setActiveMatterIndex(idx)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                              isActive ? 'bg-primary-500 text-white font-extrabold shadow-sm' : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
                            }`}
                          >
                            <span className="truncate pr-1">{idx + 1}. {matter.name}</span>
                            <span
                              className={`text-[8px] font-bold uppercase shrink-0 font-mono px-1.5 py-0.5 rounded ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : matter.category === 'Environmental' ? 'bg-emerald-50 text-emerald-700' :
                                    matter.category === 'Social' ? 'bg-blue-50 text-blue-700' :
                                    'bg-purple-50 text-purple-700'
                              }`}
                            >
                              {matter.category[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {activeMatters[activeMatterIndex] && (
                  <Card className="lg:col-span-8 bg-white border-navy-100/80 p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-navy-50">
                      <div>
                        <span className="text-[10px] text-navy-400 font-bold uppercase font-mono tracking-widest block mb-1">
                          Sustainability Matter {activeMatterIndex + 1} of {activeMatters.length}
                        </span>

                        <div className="flex items-center space-x-2">
                          <h4 className="text-base font-extrabold text-navy-950">{activeMatters[activeMatterIndex].name}</h4>
                          <div className="relative group/tooltip inline-block">
                            <HelpCircle className="w-4 h-4 text-navy-400 hover:text-navy-600 cursor-help" />
                            <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 bg-navy-950 text-white text-[10px] font-medium leading-relaxed p-3 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 w-56 z-50 pointer-events-none">
                              {activeMatters[activeMatterIndex].description}
                            </div>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                          activeMatters[activeMatterIndex].category === 'Environmental' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          activeMatters[activeMatterIndex].category === 'Social' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-purple-50 text-purple-700 border-purple-100'
                        }`}
                      >
                        {activeMatters[activeMatterIndex].category} Matter
                      </span>
                    </div>

                    <div className="bg-navy-50/50 p-4 rounded-2xl border border-navy-100/40 text-xs text-navy-600 leading-relaxed">
                      <div className="flex items-start space-x-2">
                        <Info className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                        <span>{activeMatters[activeMatterIndex].description}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-2">
                      <div className="space-y-4 p-5 bg-slate-50/40 rounded-2xl border border-navy-100/30">
                        <div>
                          <label className="text-xs font-bold text-navy-900 block">1. Financial Materiality</label>
                          <span className="text-[10px] text-navy-400 mt-0.5 block leading-normal">
                            Significance of financial, operational, or legal impacts of this topic on your business strategy and enterprise value.
                          </span>
                        </div>

                        <div className="space-y-3 pt-2">
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={scores[activeMatters[activeMatterIndex].id]?.impact || 3}
                            onChange={(e) => setScoreValue(activeMatters[activeMatterIndex].id, 'impact', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-navy-100 rounded-lg appearance-none cursor-pointer accent-primary-500"
                          />

                          <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-navy-50">
                            <span className="text-[10px] font-semibold text-navy-500">Selected Intensity:</span>
                            <span className="text-xs font-bold font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                              {scores[activeMatters[activeMatterIndex].id]?.impact || 3} — {
                                { 1: 'Minor / Minimal', 2: 'Moderate', 3: 'Significant', 4: 'Major', 5: 'Critical' }[scores[activeMatters[activeMatterIndex].id]?.impact || 3]
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 p-5 bg-slate-50/40 rounded-2xl border border-navy-100/30">
                        <div>
                          <label className="text-xs font-bold text-navy-900 block">2. Impact Materiality</label>
                          <span className="text-[10px] text-navy-400 mt-0.5 block leading-normal">
                            How significant is this topic's effect on the economy, environment, and people — caused or contributed to by your company's own operations and value chain? Informed by your stakeholder consultations.
                          </span>
                        </div>

                        <div className="space-y-3 pt-2">
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={scores[activeMatters[activeMatterIndex].id]?.influence || 3}
                            onChange={(e) => setScoreValue(activeMatters[activeMatterIndex].id, 'influence', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-navy-100 rounded-lg appearance-none cursor-pointer accent-primary-500"
                          />

                          <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-navy-50">
                            <span className="text-[10px] font-semibold text-navy-500">Selected Intensity:</span>
                            <span className="text-xs font-bold font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                              {scores[activeMatters[activeMatterIndex].id]?.influence || 3} — {
                                { 1: 'Minor / Minimal', 2: 'Moderate', 3: 'Significant', 4: 'Major', 5: 'Critical' }[scores[activeMatters[activeMatterIndex].id]?.influence || 3]
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-bold text-navy-900 block">Rationale / Evidence (optional)</label>
                        <DraftWithAiButton
                          draftType="materiality-rationale"
                          context={{
                            matterName: activeMatters[activeMatterIndex].name,
                            matterCategory: activeMatters[activeMatterIndex].category,
                            matterDescription: activeMatters[activeMatterIndex].description,
                            impactScore: String(scores[activeMatters[activeMatterIndex].id]?.impact ?? 3),
                            influenceScore: String(scores[activeMatters[activeMatterIndex].id]?.influence ?? 3),
                          }}
                          onDraft={(text) => setScoreRationale(activeMatters[activeMatterIndex].id, text)}
                        />
                      </div>
                      <span className="text-[10px] text-navy-400 block leading-normal">
                        Document why this matter scored the way it did — Bursa Malaysia's guide expects disclosures to explain relevance, not just show a number. This becomes part of your audit evidence.
                      </span>
                      <textarea
                        rows={2}
                        value={scores[activeMatters[activeMatterIndex].id]?.rationale || ''}
                        onChange={(e) => setScoreRationale(activeMatters[activeMatterIndex].id, e.target.value)}
                        placeholder="e.g. Stakeholder survey Q2 2026 flagged this as a top-3 concern; also cited in our supply-chain risk register…"
                        className="w-full px-3 py-2 text-xs text-navy-800 bg-white border border-navy-100 rounded-xl outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none placeholder-navy-300"
                      />
                    </div>

                    <div className="pt-6 border-t border-navy-100 flex items-center justify-between">
                      <Button variant="secondary" onClick={() => setCurrentStep(1)} icon={<ChevronLeft className="w-4 h-4" />}>
                        Back to Stakeholders
                      </Button>

                      <div className="flex items-center space-x-2">
                        {activeMatterIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveMatterIndex((prev) => prev - 1)}
                            className="px-4 py-2 border border-navy-200 hover:bg-navy-50 text-navy-600 rounded-full text-xs font-bold cursor-pointer transition-all"
                          >
                            Prev Matter
                          </button>
                        )}

                        {activeMatterIndex < activeMatters.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setActiveMatterIndex((prev) => prev + 1)}
                            className="px-5 py-2 bg-navy-950 text-white hover:bg-navy-900 rounded-full text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5"
                          >
                            <span>Next Matter</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <Button variant="primary" onClick={() => setCurrentStep(3)} icon={<ChevronRight className="w-4 h-4" />} iconPosition="right">
                            Generate Matrix Plot
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ========================================================
                STEP 3: MATRIX OUTPUT & LIST RANKING
               ======================================================== */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <Card className="lg:col-span-5 bg-white border-navy-100/80 p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-navy-950">Corporate Materiality Matrix</h3>
                      <p className="text-xs text-navy-400 mt-0.5">
                        Double-materiality plotting: financial materiality (effect on the business) against impact materiality (effect on economy, environment & people).
                      </p>
                    </div>

                    <div className="py-4">{renderMatrixSVG(scores, activeMatters)}</div>

                    <div className="pt-3 border-t border-navy-100 flex flex-wrap justify-between items-center gap-2 text-[10px] text-navy-400">
                      <span className="flex items-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5" />
                        <span>High Priority</span>
                      </span>
                      <span className="flex items-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5" />
                        <span>Medium Priority</span>
                      </span>
                      <span className="flex items-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mr-1.5" />
                        <span>Low Priority</span>
                      </span>
                    </div>
                  </Card>

                  <Card className="lg:col-span-7 bg-white border-navy-100/80 p-0 overflow-hidden" padded="none">
                    <div className="p-6 border-b border-navy-100/50">
                      <h3 className="text-sm font-extrabold text-navy-950">Double-Materiality Indicators Priority Table</h3>
                      <p className="text-xs text-navy-400 mt-0.5">
                        ESG indicators ranked in descending order of average combined scoring values.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-navy-100 bg-navy-50/50 text-[10px] text-navy-400 uppercase tracking-wider font-mono">
                            <th className="px-6 py-3 font-bold">Rank</th>
                            <th className="px-6 py-3 font-bold">Sustainability Matter</th>
                            <th className="px-6 py-3 font-bold text-center">Financial</th>
                            <th className="px-6 py-3 font-bold text-center">Impact</th>
                            <th className="px-6 py-3 font-bold text-right">Priority Class</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-navy-50 text-xs">
                          {(() => {
                            const rankedList = activeMatters
                              .map((m) => {
                                const mScore = scores[m.id] || { impact: 3, influence: 3 };
                                return { ...m, score: mScore, average: (mScore.impact + mScore.influence) / 2 };
                              })
                              .sort((a, b) => b.average - a.average);

                            return rankedList.map((m, idx) => {
                              const pInfo = getPriorityInfo(m.score.impact, m.score.influence);
                              return (
                                <tr key={m.id} className="hover:bg-navy-50/20 transition-colors">
                                  <td className="px-6 py-4 text-center font-mono font-black text-navy-500">#{idx + 1}</td>
                                  <td className="px-6 py-4">
                                    <span className="font-bold text-navy-900 block leading-tight">{m.name}</span>
                                    <span className="text-[9px] text-navy-400 font-bold block mt-1 uppercase tracking-wider">{m.category} Indicator</span>
                                  </td>
                                  <td className="px-6 py-4 text-center font-mono font-bold text-navy-800">{m.score.impact}</td>
                                  <td className="px-6 py-4 text-center font-mono font-bold text-navy-800">{m.score.influence}</td>
                                  <td className="px-6 py-4 text-right">
                                    <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border ${pInfo.bgLight}`}>
                                      {pInfo.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-6 border-t border-navy-100 flex items-center justify-between">
                      <Button variant="secondary" onClick={() => setCurrentStep(2)} icon={<ChevronLeft className="w-4 h-4" />}>
                        Back to Scoring
                      </Button>

                      <Button variant="primary" onClick={() => setCurrentStep(4)} icon={<ChevronRight className="w-4 h-4" />} iconPosition="right">
                        Continue to Summary
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* ========================================================
                STEP 4: SUMMARY & SNAPSHOT SAVE
               ======================================================== */}
            {currentStep === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-1.5 bg-primary-50 rounded-xl inline-block border border-primary-100">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-bold text-navy-950">Snapshot Capture</h3>
                  <p className="text-xs text-navy-500 leading-relaxed">
                    Finalize your materiality assessment by securing a baseline audit snapshot.
                  </p>
                  <p className="text-xs text-navy-500 leading-relaxed">
                    This captures your selected stakeholders, scored matter indicators, and priority ranks into a historical timeline. Versioned snapshots provide proof of compliance to Bursa auditors or SME supply chain partners.
                  </p>

                  <div className="p-4 bg-amber-50 border border-amber-200/50 rounded-2xl">
                    <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest block font-mono">Snapshot Compliance Note</span>
                    <p className="text-[10px] text-amber-950 mt-1 leading-normal">
                      This snapshot saves as a Draft. Per Bursa Malaysia's guidance, a Company Admin should formally validate it afterward from the History tab before it's treated as final.
                    </p>
                  </div>
                </div>

                <Card className="lg:col-span-8 bg-white border-navy-100/80 p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-navy-950">Assessment Summary Review</h4>
                    <p className="text-xs text-navy-400 mt-0.5">Please review your mapped parameters before sealing the snapshot.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="p-4 bg-navy-50/50 rounded-xl border border-navy-100/30">
                      <span className="text-[9px] font-bold text-navy-400 uppercase font-mono block">Stakeholders</span>
                      <span className="text-lg font-black text-navy-950 font-mono mt-1 block">{stakeholders.filter((s) => s.selected).length}</span>
                    </div>

                    <div className="p-4 bg-navy-50/50 rounded-xl border border-navy-100/30">
                      <span className="text-[9px] font-bold text-navy-400 uppercase font-mono block">Scored Matters</span>
                      <span className="text-lg font-black text-navy-950 font-mono mt-1 block">{activeMatters.length}</span>
                    </div>

                    <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                      <span className="text-[9px] font-bold text-rose-700 uppercase font-mono block">High Priority</span>
                      <span className="text-lg font-black text-rose-950 font-mono mt-1 block">
                        {activeMatters.filter((m) => {
                          const mScore = scores[m.id] || { impact: 3, influence: 3 };
                          return isHighPriority(mScore.impact, mScore.influence);
                        }).length}
                      </span>
                    </div>

                    <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100">
                      <span className="text-[9px] font-bold text-amber-700 uppercase font-mono block">Med/Low Priority</span>
                      <span className="text-lg font-black text-amber-950 font-mono mt-1 block">
                        {activeMatters.filter((m) => {
                          const mScore = scores[m.id] || { impact: 3, influence: 3 };
                          return !isHighPriority(mScore.impact, mScore.influence);
                        }).length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block">Critical Disclosure Focus Areas</span>

                    <div className="divide-y divide-navy-50 bg-navy-50/20 border border-navy-100/50 rounded-2xl overflow-hidden text-xs">
                      {activeMatters
                        .filter((m) => {
                          const mScore = scores[m.id] || { impact: 3, influence: 3 };
                          return isHighPriority(mScore.impact, mScore.influence);
                        })
                        .map((m) => {
                          const mScore = scores[m.id] || { impact: 3, influence: 3 };
                          return (
                            <div key={m.id} className="p-4 flex items-center justify-between hover:bg-navy-50/40">
                              <div className="flex items-center space-x-2">
                                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold font-mono text-[9px] flex items-center justify-center">
                                  {m.category[0]}
                                </span>
                                <div>
                                  <span className="font-bold text-navy-900 block">{m.name}</span>
                                  <span className="text-[10px] text-navy-400 font-semibold uppercase">{m.category} Indicator</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-mono font-bold text-rose-600 block">Financial: {mScore.impact} | Impact: {mScore.influence}</span>
                                <span className="text-[9px] text-rose-500 font-extrabold uppercase">Critical</span>
                              </div>
                            </div>
                          );
                        })}

                      {activeMatters.filter((m) => {
                        const mScore = scores[m.id] || { impact: 3, influence: 3 };
                        return isHighPriority(mScore.impact, mScore.influence);
                      }).length === 0 && (
                        <div className="p-6 text-center text-navy-400">
                          No indicators met the double-materiality High Priority threshold.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-navy-100 flex items-center justify-between">
                    <Button variant="secondary" onClick={() => setCurrentStep(3)} icon={<ChevronLeft className="w-4 h-4" />}>
                      Back to Matrix
                    </Button>

                    <Button variant="primary" onClick={handleSaveAssessment} icon={<CheckCircle2 className="w-4 h-4" />} disabled={isSaving}>
                      {isSaving ? 'Saving…' : 'Save Assessment & Close'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
