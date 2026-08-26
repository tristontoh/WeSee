/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  Sparkles,
  HelpCircle,
  FileCheck2,
  FileText
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import Select from './ui/Select';
import {
  climateApi,
  RiskOpportunityType,
  TimeHorizon,
  Currency,
  ReviewFrequency,
  IntegrationLevel,
  S1ItemResponse,
  BusinessSegmentResponse,
  UpsertS1ItemRequest,
  IfrsS1DisclosureResponse,
  IfrsS2Response,
  Scope3CategoryResponse,
  EmissionFactorResponse,
  EmissionActivityEntryResponse,
  EmissionScopeType
} from '../api/climateApi';
import { targetsApi, PerformanceTargetResponse } from '../api/targetsApi';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import DraftWithAiButton from './ai/DraftWithAiButton';
import { fiscalYearKeys } from '../utils/fiscalYears';

const CURRENT_FISCAL_YEAR = 2026;

// TYPES FOR IFRS S1
type FrontendRiskType = 'Risk' | 'Opportunity';
type FrontendHorizon = 'Short' | 'Medium' | 'Long';

interface S1RiskOpportunity {
  id: string;
  title: string;
  type: FrontendRiskType;
  description: string;
  horizon: FrontendHorizon;
  financialImpact: string;
  currency: Currency;
}

interface Segment {
  id: string;
  name: string;
  items: S1RiskOpportunity[];
}

// TYPES FOR IFRS S2
type FrontendReviewFrequency = 'Monthly' | 'Quarterly' | 'Bi-Annually' | 'Annually';
type FrontendIntegrationLevel = 'Fully Integrated' | 'Partially Integrated' | 'Standalone Process';

interface S2Sections {
  governance: {
    oversightDescription: string;
    reviewFrequency: FrontendReviewFrequency;
    responsibleCommittee: string;
  };
  strategy: {
    physicalRisks: string;
    transitionPlan: string;
    climateResilience: string;
  };
  riskManagement: {
    identificationProcess: string;
    integrationLevel: FrontendIntegrationLevel;
  };
  metricsTargets: {
    trackedMetrics: string;
    reductionTargets: string;
    carbonPricing: string;
    transitionRiskAssetPct: string;
    physicalRiskAssetPct: string;
    climateOpportunityAssetPct: string;
    climateCapex: string;
    climateCapexCurrency: Currency;
    executiveRemunerationLinked: boolean;
    executiveRemunerationDescription: string;
    carbonPriceValue: string;
    carbonPriceCurrency: Currency;
  };
}

interface Scope3CategoryUI {
  id: string;
  name: string;
  tooltip: string;
  standardCategoryNumber: number | null;
  mandatory: boolean;
  values: { [year: string]: number };
  reliefByYear: { [year: string]: boolean };
}

interface S2EmissionsData {
  scope1: { [year: string]: number };
  scope2: { [year: string]: number };
  scope3: Scope3CategoryUI[];
}

// ========================================================
// BACKEND <-> FRONTEND MAPPING HELPERS
// ========================================================
const TYPE_TO_BACKEND: Record<FrontendRiskType, RiskOpportunityType> = {
  Risk: 'RISK',
  Opportunity: 'OPPORTUNITY'
};
const TYPE_FROM_BACKEND: Record<RiskOpportunityType, FrontendRiskType> = {
  RISK: 'Risk',
  OPPORTUNITY: 'Opportunity'
};

const HORIZON_TO_BACKEND: Record<FrontendHorizon, TimeHorizon> = {
  Short: 'SHORT',
  Medium: 'MEDIUM',
  Long: 'LONG'
};
const HORIZON_FROM_BACKEND: Record<TimeHorizon, FrontendHorizon> = {
  SHORT: 'Short',
  MEDIUM: 'Medium',
  LONG: 'Long'
};

const REVIEW_FREQ_TO_BACKEND: Record<FrontendReviewFrequency, ReviewFrequency> = {
  Monthly: 'MONTHLY',
  Quarterly: 'QUARTERLY',
  'Bi-Annually': 'BI_ANNUALLY',
  Annually: 'ANNUALLY'
};
const REVIEW_FREQ_FROM_BACKEND: Record<ReviewFrequency, FrontendReviewFrequency> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  BI_ANNUALLY: 'Bi-Annually',
  ANNUALLY: 'Annually'
};

const INTEGRATION_TO_BACKEND: Record<FrontendIntegrationLevel, IntegrationLevel> = {
  'Fully Integrated': 'FULLY_INTEGRATED',
  'Partially Integrated': 'PARTIALLY_INTEGRATED',
  'Standalone Process': 'STANDALONE_PROCESS'
};
const INTEGRATION_FROM_BACKEND: Record<IntegrationLevel, FrontendIntegrationLevel> = {
  FULLY_INTEGRATED: 'Fully Integrated',
  PARTIALLY_INTEGRATED: 'Partially Integrated',
  STANDALONE_PROCESS: 'Standalone Process'
};

function fromS1Item(item: S1ItemResponse): S1RiskOpportunity {
  return {
    id: item.id,
    title: item.title,
    type: TYPE_FROM_BACKEND[item.type],
    description: item.description ?? '',
    horizon: HORIZON_FROM_BACKEND[item.horizon],
    financialImpact: item.financialImpact != null ? String(item.financialImpact) : '',
    currency: item.currency
  };
}

function toUpsertRequest(card: S1RiskOpportunity): UpsertS1ItemRequest {
  const trimmedImpact = card.financialImpact.trim();
  return {
    title: card.title,
    type: TYPE_TO_BACKEND[card.type],
    description: card.description || undefined,
    horizon: HORIZON_TO_BACKEND[card.horizon],
    financialImpact: trimmedImpact === '' ? undefined : Number(trimmedImpact),
    currency: card.currency
  };
}

function fromSegment(seg: BusinessSegmentResponse): Segment {
  return {
    id: seg.id,
    name: seg.name,
    items: seg.items.map(fromS1Item)
  };
}

// TYPES FOR IFRS S1's Governance / Risk Management / Metrics & Targets pillars (Strategy is
// covered separately by the per-segment risk/opportunity cards above).
interface S1DisclosureSections {
  governance: {
    oversightDescription: string;
    reviewFrequency: FrontendReviewFrequency;
    responsibleCommittee: string;
  };
  riskManagement: {
    identificationProcess: string;
    integrationLevel: FrontendIntegrationLevel;
  };
  metricsTargets: {
    trackedMetrics: string;
    targetsSummary: string;
    connectedInformation: string;
  };
}

function fromS1DisclosureResponse(r: IfrsS1DisclosureResponse): S1DisclosureSections {
  return {
    governance: {
      oversightDescription: r.oversightDescription ?? '',
      reviewFrequency: r.reviewFrequency ? REVIEW_FREQ_FROM_BACKEND[r.reviewFrequency] : 'Quarterly',
      responsibleCommittee: r.responsibleCommittee ?? ''
    },
    riskManagement: {
      identificationProcess: r.identificationProcess ?? '',
      integrationLevel: r.integrationLevel ? INTEGRATION_FROM_BACKEND[r.integrationLevel] : 'Partially Integrated'
    },
    metricsTargets: {
      trackedMetrics: r.trackedMetrics ?? '',
      targetsSummary: r.targetsSummary ?? '',
      connectedInformation: r.connectedInformation ?? ''
    }
  };
}

function toS1DisclosureRequest(s: S1DisclosureSections): IfrsS1DisclosureResponse {
  return {
    oversightDescription: s.governance.oversightDescription || null,
    reviewFrequency: REVIEW_FREQ_TO_BACKEND[s.governance.reviewFrequency],
    responsibleCommittee: s.governance.responsibleCommittee || null,
    identificationProcess: s.riskManagement.identificationProcess || null,
    integrationLevel: INTEGRATION_TO_BACKEND[s.riskManagement.integrationLevel],
    trackedMetrics: s.metricsTargets.trackedMetrics || null,
    targetsSummary: s.metricsTargets.targetsSummary || null,
    connectedInformation: s.metricsTargets.connectedInformation || null
  };
}

const EMPTY_S1_DISCLOSURE: S1DisclosureSections = {
  governance: { oversightDescription: '', reviewFrequency: 'Quarterly', responsibleCommittee: '' },
  riskManagement: { identificationProcess: '', integrationLevel: 'Partially Integrated' },
  metricsTargets: { trackedMetrics: '', targetsSummary: '', connectedInformation: '' }
};

function fromS2Response(r: IfrsS2Response): S2Sections {
  return {
    governance: {
      oversightDescription: r.oversightDescription ?? '',
      reviewFrequency: r.reviewFrequency ? REVIEW_FREQ_FROM_BACKEND[r.reviewFrequency] : 'Quarterly',
      responsibleCommittee: r.responsibleCommittee ?? ''
    },
    strategy: {
      physicalRisks: r.physicalRisks ?? '',
      transitionPlan: r.transitionPlan ?? '',
      climateResilience: r.climateResilience ?? ''
    },
    riskManagement: {
      identificationProcess: r.identificationProcess ?? '',
      integrationLevel: r.integrationLevel ? INTEGRATION_FROM_BACKEND[r.integrationLevel] : 'Partially Integrated'
    },
    metricsTargets: {
      trackedMetrics: r.trackedMetrics ?? '',
      reductionTargets: r.reductionTargets ?? '',
      carbonPricing: r.carbonPricing ?? '',
      transitionRiskAssetPct: r.transitionRiskAssetPct != null ? String(r.transitionRiskAssetPct) : '',
      physicalRiskAssetPct: r.physicalRiskAssetPct != null ? String(r.physicalRiskAssetPct) : '',
      climateOpportunityAssetPct: r.climateOpportunityAssetPct != null ? String(r.climateOpportunityAssetPct) : '',
      climateCapex: r.climateCapex != null ? String(r.climateCapex) : '',
      climateCapexCurrency: r.climateCapexCurrency ?? 'MYR',
      executiveRemunerationLinked: r.executiveRemunerationLinked ?? false,
      executiveRemunerationDescription: r.executiveRemunerationDescription ?? '',
      carbonPriceValue: r.carbonPriceValue != null ? String(r.carbonPriceValue) : '',
      carbonPriceCurrency: r.carbonPriceCurrency ?? 'MYR'
    }
  };
}

function toS2Request(s: S2Sections): IfrsS2Response {
  const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));
  return {
    oversightDescription: s.governance.oversightDescription || null,
    reviewFrequency: REVIEW_FREQ_TO_BACKEND[s.governance.reviewFrequency],
    responsibleCommittee: s.governance.responsibleCommittee || null,
    physicalRisks: s.strategy.physicalRisks || null,
    transitionPlan: s.strategy.transitionPlan || null,
    climateResilience: s.strategy.climateResilience || null,
    identificationProcess: s.riskManagement.identificationProcess || null,
    integrationLevel: INTEGRATION_TO_BACKEND[s.riskManagement.integrationLevel],
    trackedMetrics: s.metricsTargets.trackedMetrics || null,
    reductionTargets: s.metricsTargets.reductionTargets || null,
    carbonPricing: s.metricsTargets.carbonPricing || null,
    transitionRiskAssetPct: num(s.metricsTargets.transitionRiskAssetPct),
    physicalRiskAssetPct: num(s.metricsTargets.physicalRiskAssetPct),
    climateOpportunityAssetPct: num(s.metricsTargets.climateOpportunityAssetPct),
    climateCapex: num(s.metricsTargets.climateCapex),
    climateCapexCurrency: s.metricsTargets.climateCapexCurrency,
    executiveRemunerationLinked: s.metricsTargets.executiveRemunerationLinked,
    executiveRemunerationDescription: s.metricsTargets.executiveRemunerationDescription || null,
    carbonPriceValue: num(s.metricsTargets.carbonPriceValue),
    carbonPriceCurrency: s.metricsTargets.carbonPriceCurrency,
    linkedTargetId: null
  };
}

const EMPTY_S2_SECTIONS: S2Sections = {
  governance: { oversightDescription: '', reviewFrequency: 'Quarterly', responsibleCommittee: '' },
  strategy: { physicalRisks: '', transitionPlan: '', climateResilience: '' },
  riskManagement: { identificationProcess: '', integrationLevel: 'Partially Integrated' },
  metricsTargets: {
    trackedMetrics: '', reductionTargets: '', carbonPricing: '',
    transitionRiskAssetPct: '', physicalRiskAssetPct: '', climateOpportunityAssetPct: '',
    climateCapex: '', climateCapexCurrency: 'MYR',
    executiveRemunerationLinked: false, executiveRemunerationDescription: '',
    carbonPriceValue: '', carbonPriceCurrency: 'MYR'
  }
};

const fiscalYearToYearKey = (fy: number): string => `FY${fy}`;
const yearKeyToFiscalYear = (yearKey: string): number => parseInt(yearKey.replace('FY', ''), 10);

function fromScope3Category(c: Scope3CategoryResponse): Scope3CategoryUI {
  const values: { [year: string]: number } = {};
  const reliefByYear: { [year: string]: boolean } = {};
  c.values.forEach((v) => {
    const key = fiscalYearToYearKey(v.fiscalYear);
    values[key] = v.value;
    reliefByYear[key] = v.transitionRelief;
  });
  return {
    id: c.id,
    name: c.name,
    tooltip: c.tooltip ?? '',
    standardCategoryNumber: c.standardCategoryNumber,
    mandatory: c.mandatory,
    values,
    reliefByYear
  };
}

// ========================================================
// 1. IFRS S1 COMPONENT
// ========================================================
export function IfrsS1Form() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const [newSegmentInput, setNewSegmentInput] = useState('');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editSegmentNameInput, setEditSegmentNameInput] = useState('');
  const [confirmDeleteSegmentId, setConfirmDeleteSegmentId] = useState<string | null>(null);

  // Governance / Risk Management / Metrics & Targets pillars — Strategy is the segment/risk cards below.
  const [disclosure, setDisclosure] = useState<S1DisclosureSections>(EMPTY_S1_DISCLOSURE);
  const [openPillar, setOpenPillar] = useState<'governance' | 'risk' | 'metrics' | null>('governance');

  useEffect(() => {
    climateApi.listSegments().then((data) => {
      const mapped = data.map(fromSegment);
      setSegments(mapped);
      if (mapped.length > 0) setActiveSegmentId(mapped[0].id);
    });
    climateApi.getS1Disclosure().then((data) => setDisclosure(fromS1DisclosureResponse(data)));
  }, []);

  // Visual confirmation only — every field edit already persists immediately via the API calls below.
  const handleSave = () => {
    showToast('S1 Disclosures Saved!', 'success');
  };

  const togglePillar = (pillar: 'governance' | 'risk' | 'metrics') => {
    setOpenPillar(openPillar === pillar ? null : pillar);
  };

  const updateDisclosureField = (sec: keyof S1DisclosureSections, field: string, value: any) => {
    setDisclosure((prev) => {
      const updated = { ...prev, [sec]: { ...prev[sec], [field]: value } };
      climateApi.updateS1Disclosure(toS1DisclosureRequest(updated));
      return updated;
    });
  };

  const addCustomSegment = () => {
    const name = newSegmentInput.trim();
    if (!name) return;
    if (segments.some((s) => s.name === name)) {
      showToast('Segment already exists', 'error');
      return;
    }
    climateApi.createSegment(name).then((created) => {
      const mapped = fromSegment(created);
      setSegments((prev) => [...prev, mapped]);
      setActiveSegmentId(mapped.id);
    });
    setNewSegmentInput('');
  };

  const startRenameSegment = (seg: Segment) => {
    setEditingSegmentId(seg.id);
    setEditSegmentNameInput(seg.name);
  };

  const commitRenameSegment = (segmentId: string) => {
    const name = editSegmentNameInput.trim();
    setEditingSegmentId(null);
    const current = segments.find((s) => s.id === segmentId);
    if (!name || !current || name === current.name) return;
    if (segments.some((s) => s.id !== segmentId && s.name.toLowerCase() === name.toLowerCase())) {
      showToast('Segment already exists', 'error');
      return;
    }
    setSegments((prev) => prev.map((s) => (s.id === segmentId ? { ...s, name } : s)));
    climateApi.renameSegment(segmentId, name);
  };

  const handleDeleteSegment = (segmentId: string) => {
    setSegments((prev) => {
      const remaining = prev.filter((s) => s.id !== segmentId);
      if (activeSegmentId === segmentId) {
        setActiveSegmentId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
    climateApi.deleteSegment(segmentId);
    setConfirmDeleteSegmentId(null);
  };

  const addRiskCard = () => {
    if (!activeSegmentId) return;
    const requestData: UpsertS1ItemRequest = {
      title: 'New Climate Risk / Opportunity',
      type: 'RISK',
      description: undefined,
      horizon: 'MEDIUM',
      financialImpact: undefined,
      currency: 'MYR'
    };

    climateApi.addItem(activeSegmentId, requestData).then((created) => {
      const newCard = fromS1Item(created);
      setSegments((prev) =>
        prev.map((seg) => (seg.id === activeSegmentId ? { ...seg, items: [...seg.items, newCard] } : seg))
      );
    });
  };

  const updateCardField = (cardId: string, field: keyof S1RiskOpportunity, value: any) => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id !== activeSegmentId) return seg;
        const updatedItems = seg.items.map((c) => {
          if (c.id !== cardId) return c;
          const updatedCard = { ...c, [field]: value };
          climateApi.updateItem(cardId, toUpsertRequest(updatedCard));
          return updatedCard;
        });
        return { ...seg, items: updatedItems };
      })
    );
  };

  const deleteCard = (cardId: string) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === activeSegmentId ? { ...seg, items: seg.items.filter((c) => c.id !== cardId) } : seg))
    );
    climateApi.deleteItem(cardId);
  };

  const activeSegmentObj = segments.find((s) => s.id === activeSegmentId);
  const activeCards = activeSegmentObj?.items ?? [];

  return (
    <div className="space-y-6">

      {/* Overview Block */}
      <div className="bg-white border border-navy-100 p-6 rounded-3xl space-y-2">
        <h4 className="text-sm font-black text-navy-950 uppercase tracking-wider flex items-center space-x-2">
          <FileText className="w-4 h-4 text-primary-500" />
          <span>IFRS S1 — General Disclosures Framework</span>
        </h4>
        <p className="text-xs text-navy-500 leading-relaxed">
          Disclose material information about sustainability-related risks and opportunities that is useful to primary investors when evaluating capital allocation and enterprise value. Walk through disclosures systematically across principal business segments.
        </p>
      </div>

      {/* 1. GOVERNANCE Accordion */}
      <div className="bg-white border border-navy-100 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => togglePillar('governance')}
          className="w-full flex items-center justify-between px-5 py-4 bg-navy-50/30 hover:bg-navy-50/60 text-left cursor-pointer transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono border border-indigo-100">P1</span>
            <h5 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide">Governance oversight processes</h5>
          </div>
          {openPillar === 'governance' ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
        </button>

        {openPillar === 'governance' && (
          <div className="p-5 border-t border-navy-50 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-semibold">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Board-level Oversight of Sustainability Matters</label>
                <DraftWithAiButton
                  draftType="ifrs-s1-oversight"
                  context={{ sector: user?.sector ?? '', fiscalYear: String(CURRENT_FISCAL_YEAR) }}
                  onDraft={(text) => updateDisclosureField('governance', 'oversightDescription', text)}
                />
              </div>
              <textarea
                rows={3}
                value={disclosure.governance.oversightDescription}
                onChange={(e) => updateDisclosureField('governance', 'oversightDescription', e.target.value)}
                className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white bg-navy-50/10"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Oversight & Monitoring Frequency</label>
                <Select
                  size="sm"
                  className="w-full"
                  aria-label="Review frequency"
                  value={disclosure.governance.reviewFrequency}
                  onChange={(v) => updateDisclosureField('governance', 'reviewFrequency', v)}
                  options={[
                    { value: 'Monthly', label: 'Monthly Reviews' },
                    { value: 'Quarterly', label: 'Quarterly Reviews' },
                    { value: 'Bi-Annually', label: 'Bi-Annual Audits' },
                    { value: 'Annually', label: 'Annual Strategic Planning' },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Responsible Management Role / Committee</label>
                <input
                  type="text"
                  value={disclosure.governance.responsibleCommittee}
                  onChange={(e) => updateDisclosureField('governance', 'responsibleCommittee', e.target.value)}
                  className="w-full px-3 py-2 border border-navy-200 rounded-xl text-xs font-medium text-navy-950 outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white bg-navy-50/10"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Segment Selector Row — this is the Strategy (P2) pillar */}
      <div className="flex items-center space-x-2.5 pt-2">
        <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono border border-indigo-100">P2</span>
        <h5 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide">Strategy: risks & opportunities by segment</h5>
      </div>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-[10px] font-bold text-navy-400 uppercase tracking-widest font-mono">
            Principal Business Segments ({segments.length})
          </label>

          {/* Add custom segment */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Add Custom Segment..."
              value={newSegmentInput}
              onChange={(e) => setNewSegmentInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCustomSegment(); }}
              className="px-3 py-1.5 text-xs font-semibold text-navy-950 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={addCustomSegment}
              className="py-2.5 font-bold shrink-0"
            >
              Add Segment
            </Button>
          </div>
        </div>

        {/* Chips */}
        {segments.length === 0 ? (
          <div className="text-center p-8 bg-white border border-navy-100/50 rounded-3xl space-y-2">
            <AlertCircle className="w-6 h-6 text-navy-300 mx-auto" />
            <h5 className="text-xs font-bold text-navy-950">No business segments defined</h5>
            <p className="text-[11px] text-navy-400">Add a principal business segment above to begin logging climate risks and opportunities.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {segments.map(seg => {
              const count = seg.items.length;
              const isActive = activeSegmentId === seg.id;
              const isEditing = editingSegmentId === seg.id;
              const isConfirmingDelete = confirmDeleteSegmentId === seg.id;

              if (isEditing) {
                return (
                  <input
                    key={seg.id}
                    autoFocus
                    type="text"
                    value={editSegmentNameInput}
                    onChange={(e) => setEditSegmentNameInput(e.target.value)}
                    onBlur={() => commitRenameSegment(seg.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditingSegmentId(null);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-primary-500 outline-none ring-1 ring-primary-500 w-40"
                  />
                );
              }

              return (
                <div
                  key={seg.id}
                  className={`group flex items-center rounded-xl border transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-navy-600 border-navy-100 hover:border-navy-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSegmentId(seg.id)}
                    className="pl-4 pr-2 py-2 text-xs font-bold cursor-pointer flex items-center space-x-2"
                  >
                    <span>{seg.name}</span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full font-mono ${
                      isActive ? 'bg-primary-800 text-white' : 'bg-navy-50 text-navy-500'
                    }`}>
                      {count}
                    </span>
                  </button>

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1 pr-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteSegment(seg.id)}
                        className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSegmentId(null)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${isActive ? 'text-white/80 hover:text-white' : 'text-navy-500 hover:text-navy-700'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => startRenameSegment(seg)}
                        className={`p-1 rounded-lg cursor-pointer ${isActive ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-navy-400 hover:text-navy-700 hover:bg-navy-50'}`}
                        title="Rename segment"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSegmentId(seg.id)}
                        className={`p-1 rounded-lg cursor-pointer ${isActive ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-navy-400 hover:text-rose-600 hover:bg-rose-50'}`}
                        title="Delete segment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card List */}
      {segments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider font-mono">
              Risks & Opportunities logged under <span className="text-primary-600 font-extrabold">{activeSegmentObj?.name}</span>
            </h4>
            <Button
              variant="secondary"
              size="sm"
              onClick={addRiskCard}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Scenario
            </Button>
          </div>

          {activeCards.length === 0 ? (
            <div className="text-center p-12 bg-white border border-navy-100/50 rounded-3xl space-y-2">
              <AlertCircle className="w-8 h-8 text-navy-300 mx-auto" />
              <h5 className="text-xs font-bold text-navy-950">No disclosure cards defined</h5>
              <p className="text-[11px] text-navy-400">Click &ldquo;Add Scenario&rdquo; to log a material climate-related physical risk or market opportunity for this segment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeCards.map((card, idx) => (
                <Card
                  key={card.id}
                  className="bg-white border-navy-100 p-6 relative overflow-hidden transition-all hover:border-navy-200"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary-500" />

                  {/* Header section with delete */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-navy-50 mb-4">
                    <div className="flex-1 space-y-1">
                      <span className="text-[9px] font-mono font-bold text-navy-400 uppercase tracking-widest block">
                        SCENARIO INDEX #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => updateCardField(card.id, 'title', e.target.value)}
                        placeholder="Enter Risk or Opportunity Title..."
                        className="w-full text-sm font-extrabold text-navy-950 bg-transparent border-b border-transparent hover:border-navy-200 focus:border-primary-500 focus:bg-navy-50/20 px-1 py-0.5 outline-none"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Toggle Switch */}
                      <div className="flex items-center border border-navy-100 rounded-xl overflow-hidden text-[10px] font-bold uppercase tracking-wider font-mono">
                        <button
                          type="button"
                          onClick={() => updateCardField(card.id, 'type', 'Risk')}
                          className={`px-3 py-1.5 cursor-pointer ${
                            card.type === 'Risk'
                              ? 'bg-rose-50 text-rose-700 border-r border-navy-100'
                              : 'bg-white text-navy-400 border-r border-navy-100'
                          }`}
                        >
                          Risk
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCardField(card.id, 'type', 'Opportunity')}
                          className={`px-3 py-1.5 cursor-pointer ${
                            card.type === 'Opportunity'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-white text-navy-400'
                          }`}
                        >
                          Opp
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteCard(card.id)}
                        className="p-1.5 text-navy-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Remove disclosure scenario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-semibold">

                    {/* Left Column: Description */}
                    <div className="md:col-span-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block">
                          Qualitative Description & Business Context
                        </label>
                        <DraftWithAiButton
                          draftType="ifrs-s1-risk-item"
                          context={{ segmentName: activeSegmentObj?.name ?? '', itemType: card.type, itemCategory: card.title }}
                          onDraft={(text) => updateCardField(card.id, 'description', text)}
                        />
                      </div>
                      <textarea
                        rows={3}
                        value={card.description}
                        onChange={(e) => updateCardField(card.id, 'description', e.target.value)}
                        placeholder="Detail how this climate risk affects operations, supplier networks, or baseline costs..."
                        className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
                      />
                    </div>

                    {/* Right Columns */}
                    <div className="space-y-4">
                      {/* Time Horizon */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block">
                          Anticipated Time Horizon
                        </label>
                        <Select
                          size="sm"
                          className="w-full"
                          aria-label="Time horizon"
                          value={card.horizon}
                          onChange={(v) => updateCardField(card.id, 'horizon', v)}
                          options={[
                            { value: 'Short', label: 'Short-Term (1-3 years)' },
                            { value: 'Medium', label: 'Medium-Term (3-8 years)' },
                            { value: 'Long', label: 'Long-Term (8-15+ years)' },
                          ]}
                        />
                      </div>

                      {/* Financial Impact */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block">
                          Estimated Financial Impact (Annual)
                        </label>
                        <div className="flex rounded-xl overflow-hidden border border-navy-200">
                          <Select
                            seamless
                            size="sm"
                            aria-label="Currency"
                            className="w-[74px] shrink-0 bg-navy-50 border-r border-navy-200"
                            value={card.currency}
                            onChange={(v) => updateCardField(card.id, 'currency', v)}
                            options={[
                              { value: 'MYR', label: 'MYR' },
                              { value: 'USD', label: 'USD' },
                              { value: 'EUR', label: 'EUR' },
                            ]}
                          />
                          <input
                            type="text"
                            value={card.financialImpact}
                            onChange={(e) => updateCardField(card.id, 'financialImpact', e.target.value)}
                            placeholder="e.g. 250000 (Optional)"
                            className="w-full px-3 py-2 text-xs font-bold text-navy-950 outline-none focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. RISK MANAGEMENT Accordion */}
      <div className="bg-white border border-navy-100 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => togglePillar('risk')}
          className="w-full flex items-center justify-between px-5 py-4 bg-navy-50/30 hover:bg-navy-50/60 text-left cursor-pointer transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono border border-indigo-100">P3</span>
            <h5 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide">Risk Management Integration</h5>
          </div>
          {openPillar === 'risk' ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
        </button>

        {openPillar === 'risk' && (
          <div className="p-5 border-t border-navy-50 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-semibold">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Sustainability Risk Identification & Prioritisation Process</label>
                <DraftWithAiButton
                  draftType="ifrs-s1-identification"
                  context={{ sector: user?.sector ?? '', marketClassification: user?.market ?? '' }}
                  onDraft={(text) => updateDisclosureField('riskManagement', 'identificationProcess', text)}
                />
              </div>
              <textarea
                rows={3}
                value={disclosure.riskManagement.identificationProcess}
                onChange={(e) => updateDisclosureField('riskManagement', 'identificationProcess', e.target.value)}
                placeholder="e.g. Material topics identified via the annual double-materiality assessment, then escalated through enterprise risk management alongside financial and operational risks."
                className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Integration Level into Enterprise Risk Management (ERM)</label>
              <div className="flex flex-col gap-2 pt-2">
                {(['Fully Integrated', 'Partially Integrated', 'Standalone Process'] as FrontendIntegrationLevel[]).map(opt => (
                  <label key={opt} className="flex items-center space-x-2 cursor-pointer font-medium text-navy-700">
                    <input
                      type="radio"
                      name="s1-erm-integration"
                      checked={disclosure.riskManagement.integrationLevel === opt}
                      onChange={() => updateDisclosureField('riskManagement', 'integrationLevel', opt)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. METRICS & TARGETS Accordion */}
      <div className="bg-white border border-navy-100 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => togglePillar('metrics')}
          className="w-full flex items-center justify-between px-5 py-4 bg-navy-50/30 hover:bg-navy-50/60 text-left cursor-pointer transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono border border-indigo-100">P4</span>
            <h5 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide">Metrics, Targets & Connected Information</h5>
          </div>
          {openPillar === 'metrics' ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
        </button>

        {openPillar === 'metrics' && (
          <div className="p-5 border-t border-navy-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-semibold">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Metrics Tracked Across Material Matters</label>
                <DraftWithAiButton
                  draftType="ifrs-s1-tracked-metrics"
                  context={{ sector: user?.sector ?? '' }}
                  onDraft={(text) => updateDisclosureField('metricsTargets', 'trackedMetrics', text)}
                />
              </div>
              <textarea
                rows={4}
                value={disclosure.metricsTargets.trackedMetrics}
                onChange={(e) => updateDisclosureField('metricsTargets', 'trackedMetrics', e.target.value)}
                className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Targets Summary (see Targets module for detail)</label>
                <DraftWithAiButton
                  draftType="ifrs-s1-targets-summary"
                  context={{ sector: user?.sector ?? '' }}
                  onDraft={(text) => updateDisclosureField('metricsTargets', 'targetsSummary', text)}
                />
              </div>
              <textarea
                rows={4}
                value={disclosure.metricsTargets.targetsSummary}
                onChange={(e) => updateDisclosureField('metricsTargets', 'targetsSummary', e.target.value)}
                className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Connected Information (link to financial statements)</label>
                <DraftWithAiButton
                  draftType="ifrs-s1-connected-information"
                  context={{ sector: user?.sector ?? '' }}
                  onDraft={(text) => updateDisclosureField('metricsTargets', 'connectedInformation', text)}
                />
              </div>
              <textarea
                rows={4}
                value={disclosure.metricsTargets.connectedInformation}
                onChange={(e) => updateDisclosureField('metricsTargets', 'connectedInformation', e.target.value)}
                placeholder="Explain how these sustainability-related financial effects connect to the audited financial statements for the same period."
                className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Persistence Button Bar */}
      <div className="border-t border-navy-100 pt-6 flex items-center justify-between">
        <div className="text-xs text-navy-400 flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-primary-500" />
          <span>Form compiles into SEC & Bursa Malaysia disclosures.</span>
        </div>

        <div className="flex items-center space-x-3">

          <Button
            variant="primary"
            onClick={handleSave}
            icon={<FileCheck2 className="w-4 h-4" />}
          >
            Save Segment Disclosures
          </Button>
        </div>
      </div>

    </div>
  );
}

// ========================================================
// 2. IFRS S2 COMPONENT
// ========================================================
export function IfrsS2Form() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sections, setSections] = useState<S2Sections>(EMPTY_S2_SECTIONS);
  const [emissions, setEmissions] = useState<S2EmissionsData>({ scope1: {}, scope2: {}, scope3: [] });
  const [linkedTargetId, setLinkedTargetId] = useState<string>('');
  const [targets, setTargets] = useState<PerformanceTargetResponse[]>([]);

  useEffect(() => {
    climateApi.getS2().then((data) => {
      setSections(fromS2Response(data));
      setLinkedTargetId(data.linkedTargetId ?? '');
    });
    targetsApi.list().then(setTargets);
    climateApi.getEmissions().then((data) => {
      const scope1: { [year: string]: number } = {};
      data.scope1.forEach((p) => { scope1[fiscalYearToYearKey(p.fiscalYear)] = p.value; });
      const scope2: { [year: string]: number } = {};
      data.scope2.forEach((p) => { scope2[fiscalYearToYearKey(p.fiscalYear)] = p.value; });
      const scope3 = data.scope3.map(fromScope3Category);
      setEmissions({ scope1, scope2, scope3 });
    });
  }, []);

  // Collapsible accordion states
  const [openSection, setOpenSection] = useState<'governance' | 'strategy' | 'risk' | 'metrics' | null>('governance');
  const [scope3Expanded, setScope3Expanded] = useState<boolean>(true);

  // UI states
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [newScope3CategoryInput, setNewScope3CategoryInput] = useState('');
  const [newScope3TooltipInput, setNewScope3TooltipInput] = useState('');
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);

  // Visual confirmation only — every field/table edit already persists immediately via the API calls below.
  const handleSaveS2 = () => {
    showToast('S2 Disclosures Saved!', 'success');
  };

  const toggleAccordion = (sec: 'governance' | 'strategy' | 'risk' | 'metrics') => {
    setOpenSection(openSection === sec ? null : sec);
  };

  const updateSectionField = (sec: keyof S2Sections, field: string, value: any) => {
    setSections(prev => {
      const updated = {
        ...prev,
        [sec]: {
          ...prev[sec],
          [field]: value
        }
      };
      climateApi.updateS2({ ...toS2Request(updated), linkedTargetId: linkedTargetId || null });
      return updated;
    });
  };

  const handleLinkTarget = (targetId: string) => {
    setLinkedTargetId(targetId);
    climateApi.updateS2({ ...toS2Request(sections), linkedTargetId: targetId || null });
  };

  const updateEmissionsValue = (type: 'scope1' | 'scope2', year: string, value: string) => {
    const num = value.trim() === '' ? 0 : Number(value);
    if (isNaN(num)) return;
    const fiscalYear = yearKeyToFiscalYear(year);

    setEmissions(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [year]: num
      }
    }));
    if (type === 'scope1') {
      climateApi.setScope1(fiscalYear, num);
    } else {
      climateApi.setScope2(fiscalYear, num);
    }
  };

  const updateScope3Value = (categoryId: string, index: number, year: string, value: string) => {
    const num = value.trim() === '' ? 0 : Number(value);
    if (isNaN(num)) return;
    const fiscalYear = yearKeyToFiscalYear(year);
    setEmissions(prev => {
      const updatedScope3 = [...prev.scope3];
      updatedScope3[index] = { ...updatedScope3[index], values: { ...updatedScope3[index].values, [year]: num } };
      return { ...prev, scope3: updatedScope3 };
    });
    climateApi.setScope3Value(categoryId, fiscalYear, num);
  };

  const addScope3Category = () => {
    const name = newScope3CategoryInput.trim();
    if (!name) return;
    const tooltip = newScope3TooltipInput.trim() || undefined;
    climateApi.createScope3Category(name, tooltip).then((created) => {
      setEmissions(prev => ({ ...prev, scope3: [...prev.scope3, fromScope3Category(created)] }));
    });
    setNewScope3CategoryInput('');
    setNewScope3TooltipInput('');
  };

  const handleDeleteScope3Category = (categoryId: string) => {
    setEmissions(prev => ({ ...prev, scope3: prev.scope3.filter(c => c.id !== categoryId) }));
    climateApi.deleteScope3Category(categoryId);
    setConfirmDeleteCategoryId(null);
  };

  // Derived, not baked in: see utils/fiscalYears.
const years = fiscalYearKeys();

  // Activity-Based Calculator state
  const [factors, setFactors] = useState<EmissionFactorResponse[]>([]);
  const [activityEntries, setActivityEntries] = useState<EmissionActivityEntryResponse[]>([]);
  const [activityYear, setActivityYear] = useState<number>(2026);
  const [selectedFactorId, setSelectedFactorId] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<string>('');

  useEffect(() => {
    climateApi.listEmissionFactors().then(setFactors);
  }, []);

  const refreshActivityEntries = (year: number) => {
    climateApi.listActivityEntries(year).then(setActivityEntries);
  };

  useEffect(() => {
    refreshActivityEntries(activityYear);
  }, [activityYear]);

  const selectedFactor = factors.find((f) => f.id === selectedFactorId);
  const quantityNum = Number(quantityInput);
  const livePreview = selectedFactor && !isNaN(quantityNum) && quantityNum > 0
    ? (quantityNum * selectedFactor.factorValue) / 1000
    : null;

  const factorById = (id: string) => factors.find((f) => f.id === id);
  const scopeSubtotal = (scope: EmissionScopeType) =>
    activityEntries
      .filter((e) => factorById(e.emissionFactorId)?.scope === scope)
      .reduce((sum, e) => sum + e.calculatedTco2e, 0);

  const handleAddActivityEntry = () => {
    if (!selectedFactorId || isNaN(quantityNum) || quantityNum <= 0) return;
    climateApi.addActivityEntry(activityYear, selectedFactorId, quantityNum).then(() => {
      refreshActivityEntries(activityYear);
      setQuantityInput('');
    });
  };

  const handleDeleteActivityEntry = (id: string) => {
    climateApi.deleteActivityEntry(id).then(() => refreshActivityEntries(activityYear));
  };

  const handleApplyToScope = (scope: EmissionScopeType) => {
    climateApi.applyActivityToScope(activityYear, scope).then((data) => {
      const scope1: { [year: string]: number } = {};
      data.scope1.forEach((p) => { scope1[fiscalYearToYearKey(p.fiscalYear)] = p.value; });
      const scope2: { [year: string]: number } = {};
      data.scope2.forEach((p) => { scope2[fiscalYearToYearKey(p.fiscalYear)] = p.value; });
      setEmissions((prev) => ({ ...prev, scope1, scope2 }));
    });
  };

  return (
    <div className="space-y-6">

      {/* Overview Block */}
      <div className="bg-white border border-navy-100 p-6 rounded-3xl space-y-2">
        <h4 className="text-sm font-black text-navy-950 uppercase tracking-wider flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span>IFRS S2 — Climate-related Disclosures Core Framework</span>
        </h4>
        <p className="text-xs text-navy-500 leading-relaxed">
          Disclose climate-related risks (both physical and transition risks) and market opportunities across the four core ISSB pillars: Governance, Strategy, Risk Management, and Metrics &amp; Targets. Seamlessly integrate calculated Scope 1, 2, and 3 carbon accounting profiles.
        </p>
      </div>

      {/* CORE 4 COLLAPSIBLE PILLARS */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-navy-400 uppercase tracking-widest font-mono">
          ISSB Standard Disclosures Accordion
        </h4>

        {/* 1. GOVERNANCE Accordion */}
        <div className="bg-white border border-navy-100 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('governance')}
            className="w-full flex items-center justify-between px-5 py-4 bg-navy-50/30 hover:bg-navy-50/60 text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono border border-indigo-100">P1</span>
              <h5 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide">Governance oversight processes</h5>
            </div>
            {openSection === 'governance' ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
          </button>

          {openSection === 'governance' && (
            <div className="p-5 border-t border-navy-50 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-semibold">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Board-level Oversight Details</label>
                  <DraftWithAiButton
                    draftType="ifrs-s2-oversight"
                    context={{ sector: user?.sector ?? '', fiscalYear: String(CURRENT_FISCAL_YEAR) }}
                    onDraft={(text) => updateSectionField('governance', 'oversightDescription', text)}
                  />
                </div>
                <textarea
                  rows={3}
                  value={sections.governance.oversightDescription}
                  onChange={(e) => updateSectionField('governance', 'oversightDescription', e.target.value)}
                  className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white bg-navy-50/10"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Oversight & Monitoring Frequency</label>
                  <Select
                    size="sm"
                    className="w-full"
                    aria-label="Review frequency"
                    value={sections.governance.reviewFrequency}
                    onChange={(v) => updateSectionField('governance', 'reviewFrequency', v)}
                    options={[
                      { value: 'Monthly', label: 'Monthly Reviews' },
                      { value: 'Quarterly', label: 'Quarterly Reviews' },
                      { value: 'Bi-Annually', label: 'Bi-Annual Audits' },
                      { value: 'Annually', label: 'Annual Strategic Planning' },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Responsible Management Role / Committee</label>
                  <input
                    type="text"
                    value={sections.governance.responsibleCommittee}
                    onChange={(e) => updateSectionField('governance', 'responsibleCommittee', e.target.value)}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl text-xs font-medium text-navy-950 outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white bg-navy-50/10"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. STRATEGY Accordion */}
        <div className="bg-white border border-navy-100 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('strategy')}
            className="w-full flex items-center justify-between px-5 py-4 bg-navy-50/30 hover:bg-navy-50/60 text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono border border-indigo-100">P2</span>
              <h5 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide">Strategy: Climate Risks & resilience</h5>
            </div>
            {openSection === 'strategy' ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
          </button>

          {openSection === 'strategy' && (
            <div className="p-5 border-t border-navy-50 grid grid-cols-1 gap-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Identified Climate Risks & Opportunities</label>
                  <DraftWithAiButton
                    draftType="ifrs-s2-physical-risks"
                    context={{ sector: user?.sector ?? '', marketClassification: user?.market ?? '' }}
                    onDraft={(text) => updateSectionField('strategy', 'physicalRisks', text)}
                  />
                </div>
                <textarea
                  rows={2}
                  value={sections.strategy.physicalRisks}
                  onChange={(e) => updateSectionField('strategy', 'physicalRisks', e.target.value)}
                  className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Operational & Asset Transition Pathway</label>
                  <DraftWithAiButton
                    draftType="ifrs-s2-transition-plan"
                    context={{ sector: user?.sector ?? '' }}
                    onDraft={(text) => updateSectionField('strategy', 'transitionPlan', text)}
                  />
                </div>
                <textarea
                  rows={2}
                  value={sections.strategy.transitionPlan}
                  onChange={(e) => updateSectionField('strategy', 'transitionPlan', e.target.value)}
                  className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Climate Resilience Scenarios Analysis</label>
                  <DraftWithAiButton
                    draftType="ifrs-s2-climate-resilience"
                    context={{ sector: user?.sector ?? '', marketClassification: user?.market ?? '' }}
                    onDraft={(text) => updateSectionField('strategy', 'climateResilience', text)}
                  />
                </div>
                <textarea
                  rows={2}
                  value={sections.strategy.climateResilience}
                  onChange={(e) => updateSectionField('strategy', 'climateResilience', e.target.value)}
                  className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. RISK MANAGEMENT Accordion */}
        <div className="bg-white border border-navy-100 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('risk')}
            className="w-full flex items-center justify-between px-5 py-4 bg-navy-50/30 hover:bg-navy-50/60 text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono border border-indigo-100">P3</span>
              <h5 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide">Risk Management Integration</h5>
            </div>
            {openSection === 'risk' ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
          </button>

          {openSection === 'risk' && (
            <div className="p-5 border-t border-navy-50 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-semibold">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Climate Risk Identification Processes</label>
                  <DraftWithAiButton
                    draftType="ifrs-s2-identification"
                    context={{ sector: user?.sector ?? '' }}
                    onDraft={(text) => updateSectionField('riskManagement', 'identificationProcess', text)}
                  />
                </div>
                <textarea
                  rows={3}
                  value={sections.riskManagement.identificationProcess}
                  onChange={(e) => updateSectionField('riskManagement', 'identificationProcess', e.target.value)}
                  className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Integration Level into Enterprise Risk Management (ERM)</label>
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col gap-2">
                    {(['Fully Integrated', 'Partially Integrated', 'Standalone Process'] as FrontendIntegrationLevel[]).map(opt => (
                      <label key={opt} className="flex items-center space-x-2 cursor-pointer font-medium text-navy-700">
                        <input
                          type="radio"
                          name="erm-integration"
                          checked={sections.riskManagement.integrationLevel === opt}
                          onChange={() => updateSectionField('riskManagement', 'integrationLevel', opt)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-navy-400 leading-normal font-normal">
                    * Bursa Malaysia Main Market rules require eventual transition of climate exposures into principal enterprise risks.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. METRICS & TARGETS Accordion */}
        <div className="bg-white border border-navy-100 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('metrics')}
            className="w-full flex items-center justify-between px-5 py-4 bg-navy-50/30 hover:bg-navy-50/60 text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono border border-indigo-100">P4</span>
              <h5 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide">Climate-related Metrics & Targets</h5>
            </div>
            {openSection === 'metrics' ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
          </button>

          {openSection === 'metrics' && (
            <div className="p-5 border-t border-navy-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-semibold">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Tracked Metrics & KPIs</label>
                  <DraftWithAiButton
                    draftType="ifrs-s2-tracked-metrics"
                    context={{ sector: user?.sector ?? '' }}
                    onDraft={(text) => updateSectionField('metricsTargets', 'trackedMetrics', text)}
                  />
                </div>
                <textarea
                  rows={4}
                  value={sections.metricsTargets.trackedMetrics}
                  onChange={(e) => updateSectionField('metricsTargets', 'trackedMetrics', e.target.value)}
                  className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Active Carbon Reduction Goals</label>
                  <DraftWithAiButton
                    draftType="ifrs-s2-reduction-targets"
                    context={{ sector: user?.sector ?? '' }}
                    onDraft={(text) => updateSectionField('metricsTargets', 'reductionTargets', text)}
                  />
                </div>
                <textarea
                  rows={4}
                  value={sections.metricsTargets.reductionTargets}
                  onChange={(e) => updateSectionField('metricsTargets', 'reductionTargets', e.target.value)}
                  className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
                />
                <label className="text-[10px] text-navy-400 uppercase tracking-wider block pt-1">Link to a tracked target (optional)</label>
                <Select
                  size="sm"
                  className="w-full"
                  aria-label="Linked target"
                  value={linkedTargetId}
                  onChange={handleLinkTarget}
                  options={[
                    { value: '', label: 'No linked target' },
                    ...targets.map((t) => ({ value: t.id, label: t.title })),
                  ]}
                />
                {linkedTargetId && (() => {
                  const linked = targets.find((t) => t.id === linkedTargetId);
                  if (!linked) return null;
                  return (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                        {linked.progressComputed ? 'Auto-calculated' : 'Manual'} progress: {linked.currentProgress}%
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Carbon Pricing — How It's Applied in Decision-Making</label>
                  <DraftWithAiButton
                    draftType="ifrs-s2-carbon-pricing"
                    context={{ sector: user?.sector ?? '' }}
                    onDraft={(text) => updateSectionField('metricsTargets', 'carbonPricing', text)}
                  />
                </div>
                <textarea
                  rows={4}
                  value={sections.metricsTargets.carbonPricing}
                  onChange={(e) => updateSectionField('metricsTargets', 'carbonPricing', e.target.value)}
                  className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
                />
              </div>

              {/* IFRS S2's 7 cross-industry metrics: GHG emissions are captured in the ledger below;
                  carbon price value/currency and the 5 fields here complete the set. */}
              <div className="md:col-span-3 border-t border-navy-50 pt-5 mt-1 space-y-4">
                <label className="text-[10px] font-bold text-navy-400 uppercase tracking-widest font-mono block">
                  Cross-Industry Metrics
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-navy-400 uppercase tracking-wider block">% Assets Vulnerable to Transition Risk</label>
                    <input
                      type="text"
                      value={sections.metricsTargets.transitionRiskAssetPct}
                      onChange={(e) => updateSectionField('metricsTargets', 'transitionRiskAssetPct', e.target.value)}
                      placeholder="e.g. 18.5"
                      className="w-full px-3 py-2 border border-navy-200 rounded-xl text-xs font-bold text-navy-950 outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white bg-navy-50/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-navy-400 uppercase tracking-wider block">% Assets Vulnerable to Physical Risk</label>
                    <input
                      type="text"
                      value={sections.metricsTargets.physicalRiskAssetPct}
                      onChange={(e) => updateSectionField('metricsTargets', 'physicalRiskAssetPct', e.target.value)}
                      placeholder="e.g. 12"
                      className="w-full px-3 py-2 border border-navy-200 rounded-xl text-xs font-bold text-navy-950 outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white bg-navy-50/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-navy-400 uppercase tracking-wider block">% Assets Aligned with Climate Opportunities</label>
                    <input
                      type="text"
                      value={sections.metricsTargets.climateOpportunityAssetPct}
                      onChange={(e) => updateSectionField('metricsTargets', 'climateOpportunityAssetPct', e.target.value)}
                      placeholder="e.g. 9"
                      className="w-full px-3 py-2 border border-navy-200 rounded-xl text-xs font-bold text-navy-950 outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white bg-navy-50/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Capex/Financing Deployed Toward Climate Risks & Opportunities</label>
                    <div className="flex rounded-xl overflow-hidden border border-navy-200">
                      <Select
                        seamless
                        size="sm"
                        aria-label="Currency"
                        className="w-[74px] shrink-0 bg-navy-50 border-r border-navy-200"
                        value={sections.metricsTargets.climateCapexCurrency}
                        onChange={(v) => updateSectionField('metricsTargets', 'climateCapexCurrency', v)}
                        options={[
                          { value: 'MYR', label: 'MYR' },
                          { value: 'USD', label: 'USD' },
                          { value: 'EUR', label: 'EUR' },
                        ]}
                      />
                      <input
                        type="text"
                        value={sections.metricsTargets.climateCapex}
                        onChange={(e) => updateSectionField('metricsTargets', 'climateCapex', e.target.value)}
                        placeholder="e.g. 2400000"
                        className="w-full px-3 py-2 text-xs font-bold text-navy-950 outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Internal Carbon Price (per tCO2e)</label>
                    <div className="flex rounded-xl overflow-hidden border border-navy-200">
                      <Select
                        seamless
                        size="sm"
                        aria-label="Currency"
                        className="w-[74px] shrink-0 bg-navy-50 border-r border-navy-200"
                        value={sections.metricsTargets.carbonPriceCurrency}
                        onChange={(v) => updateSectionField('metricsTargets', 'carbonPriceCurrency', v)}
                        options={[
                          { value: 'MYR', label: 'MYR' },
                          { value: 'USD', label: 'USD' },
                          { value: 'EUR', label: 'EUR' },
                        ]}
                      />
                      <input
                        type="text"
                        value={sections.metricsTargets.carbonPriceValue}
                        onChange={(e) => updateSectionField('metricsTargets', 'carbonPriceValue', e.target.value)}
                        placeholder="e.g. 35"
                        className="w-full px-3 py-2 text-xs font-bold text-navy-950 outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sections.metricsTargets.executiveRemunerationLinked}
                      onChange={(e) => updateSectionField('metricsTargets', 'executiveRemunerationLinked', e.target.checked)}
                      className="rounded text-primary-600 focus:ring-primary-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-[10px] text-navy-400 uppercase tracking-wider">Executive remuneration is linked to climate performance</span>
                  </label>
                  {sections.metricsTargets.executiveRemunerationLinked && (
                    <>
                      <div className="flex justify-end">
                        <DraftWithAiButton
                          draftType="ifrs-s2-exec-remuneration"
                          context={{ sector: user?.sector ?? '' }}
                          onDraft={(text) => updateSectionField('metricsTargets', 'executiveRemunerationDescription', text)}
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={sections.metricsTargets.executiveRemunerationDescription}
                        onChange={(e) => updateSectionField('metricsTargets', 'executiveRemunerationDescription', e.target.value)}
                        placeholder="Describe how — e.g. % of short-term incentive tied to which target..."
                        className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500 bg-navy-50/10 focus:bg-white"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GHG EMISSIONS TAB SPECIFIC TABLE */}
      <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden shadow-xs">

        {/* Table Controls Header */}
        <div className="px-6 py-4.5 bg-navy-50/40 border-b border-navy-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h5 className="text-xs font-black text-navy-950 uppercase tracking-wider font-mono">
              Greenhouse Gas (GHG) Emissions Disclosure Ledger (tCO₂e)
            </h5>
            <p className="text-[10px] text-navy-400 font-semibold">
              Enter annual actual levels across directly managed emission scopes.
            </p>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/10 text-[9px] font-bold text-navy-400 uppercase tracking-widest font-mono">
                <th className="px-6 py-3.5">Emission Scope & Category</th>
                <th className="px-6 py-3.5 text-center w-[160px]">ISSB Transition Relief</th>
                {years.map(y => (
                  <th key={y} className="px-4 py-3.5 text-center w-[120px]">{y}</th>
                ))}
                <th className="px-6 py-3.5 text-center w-[80px]">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
              {/* SCOPE 1 */}
              <tr className="bg-emerald-50/10 font-bold text-navy-950">
                <td className="px-6 py-4 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Scope 1: Direct Combustion & Fleets</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[10px] text-navy-400 font-mono font-semibold">Not Applicable</span>
                </td>
                {years.map(y => (
                  <td key={y} className="px-4 py-3">
                    <input
                      type="text"
                      value={emissions.scope1[y] ?? 0}
                      onChange={(e) => updateEmissionsValue('scope1', y, e.target.value)}
                      className="w-full text-center px-1.5 py-1 text-xs font-bold text-navy-950 border border-navy-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                    />
                  </td>
                ))}
                <td className="px-6 py-4" />
              </tr>

              {/* SCOPE 2 */}
              <tr className="bg-blue-50/10 font-bold text-navy-950">
                <td className="px-6 py-4 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span>Scope 2: Indirect TNB Grid Power</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[10px] text-navy-400 font-mono font-semibold">Not Applicable</span>
                </td>
                {years.map(y => (
                  <td key={y} className="px-4 py-3">
                    <input
                      type="text"
                      value={emissions.scope2[y] ?? 0}
                      onChange={(e) => updateEmissionsValue('scope2', y, e.target.value)}
                      className="w-full text-center px-1.5 py-1 text-xs font-bold text-navy-950 border border-navy-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                    />
                  </td>
                ))}
                <td className="px-6 py-4" />
              </tr>

              {/* SCOPE 3 HEADER ROW */}
              <tr className="bg-purple-50/20 font-bold text-navy-950">
                <td className="px-6 py-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setScope3Expanded(!scope3Expanded)}
                    className="flex items-center space-x-2 cursor-pointer text-left text-navy-950"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <span>Scope 3: Upstream & Downstream Disclosures</span>
                    <span className="text-[10px] text-navy-400 transition-transform font-bold block">
                      ({scope3Expanded ? 'Hide Categories ▾' : 'Expand Categories ▸'})
                    </span>
                  </button>
                </td>
                <td className="px-6 py-3 text-center">
                  {emissions.scope3.some((cat) => Object.values(cat.reliefByYear).some(Boolean)) ? (
                    <span className="text-[9px] text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded uppercase font-bold font-mono inline-block">
                      Relief active
                    </span>
                  ) : (
                    <span className="text-[9px] text-navy-300 font-mono">—</span>
                  )}
                </td>
                {years.map(y => {
                  const total = emissions.scope3.reduce((acc, cat) => acc + (cat.values[y] || 0), 0);
                  return (
                    <td key={y} className="px-4 py-3 text-center font-mono font-black text-[11px] text-purple-950 bg-purple-50/10">
                      {Math.round(total)} t
                    </td>
                  );
                })}
                <td className="px-6 py-3" />
              </tr>

              {/* SCOPE 3 SUBCATEGORIES ACCORDION CELLS */}
              {scope3Expanded && emissions.scope3.map((cat, idx) => (
                <tr key={cat.id} className="hover:bg-navy-50/20 text-navy-700 transition-colors">
                  <td className="px-8 py-3.5 flex items-center space-x-1.5">
                    <span className="text-navy-400 text-xs shrink-0 select-none">↳</span>
                    <span className="truncate max-w-[200px]" title={cat.name}>{cat.name}</span>

                    {cat.mandatory && (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title="Mandatory financed-emissions category for financial institutions under IFRS S2">
                        Mandatory
                      </span>
                    )}

                    {/* Tooltip Info Icon — only shown when the category actually has a description */}
                    {cat.tooltip && (
                    <div className="relative inline-block shrink-0">
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredTooltip(cat.id)}
                        onMouseLeave={() => setHoveredTooltip(null)}
                        className="text-navy-400 hover:text-navy-600 outline-none p-0.5 cursor-help"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>

                      {hoveredTooltip === cat.id && (
                        <div className="absolute left-6 bottom-full mb-1 bg-navy-950 text-white text-[10px] font-medium p-3 rounded-xl shadow-2xl w-56 z-50 leading-relaxed border border-white/10 animate-fade-in">
                          {cat.tooltip}
                        </div>
                      )}
                    </div>
                    )}
                  </td>

                  <td className="px-6 py-2 text-center">
                    {Object.values(cat.reliefByYear).some(Boolean) ? (
                      <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase font-bold font-mono inline-block">
                        Relief active
                      </span>
                    ) : (
                      <span className="text-[9px] text-navy-300 font-mono">—</span>
                    )}
                  </td>

                  {years.map(y => (
                    <td key={y} className="px-4 py-2">
                      <input
                        type="text"
                        value={cat.values[y] ?? 0}
                        onChange={(e) => updateScope3Value(cat.id, idx, y, e.target.value)}
                        className="w-full text-center px-1.5 py-1 text-xs font-semibold text-navy-800 border border-navy-100/80 rounded-lg outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                      />
                    </td>
                  ))}

                  <td className="px-6 py-2 text-center">
                    {confirmDeleteCategoryId === cat.id ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteScope3Category(cat.id)}
                          className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCategoryId(null)}
                          className="px-2 py-1 text-[10px] font-bold text-navy-500 hover:text-navy-700 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : cat.mandatory ? (
                      <span className="p-1 text-navy-200 inline-block" title="Mandatory categories can't be removed">
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCategoryId(cat.id)}
                        className="p-1 text-navy-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* ADD SCOPE 3 CATEGORY ROW */}
              {scope3Expanded && (
                <tr className="bg-navy-50/10">
                  <td colSpan={years.length + 3} className="px-8 py-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      {emissions.scope3.length === 0 && (
                        <span className="text-[10px] text-navy-400 font-semibold shrink-0">No Scope 3 categories yet —</span>
                      )}
                      <input
                        type="text"
                        placeholder="Add Scope 3 Category (e.g. Category 9: Downstream Transportation)..."
                        value={newScope3CategoryInput}
                        onChange={(e) => setNewScope3CategoryInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addScope3Category(); }}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold text-navy-950 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Description shown on hover (optional)..."
                        value={newScope3TooltipInput}
                        onChange={(e) => setNewScope3TooltipInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addScope3Category(); }}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold text-navy-950 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={addScope3Category}
                        icon={<Plus className="w-3.5 h-3.5" />}
                        className="shrink-0"
                      >
                        Add Category
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ACTIVITY-BASED CALCULATOR */}
      <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-6 py-4.5 bg-navy-50/40 border-b border-navy-100 space-y-0.5">
          <h5 className="text-xs font-black text-navy-950 uppercase tracking-wider font-mono">
            Activity-Based Calculator
          </h5>
          <p className="text-[10px] text-navy-400 font-semibold">
            Log activity data (fuel, electricity, travel) against a maintained emission-factor library to calculate tCO2e — instead of typing a final number by hand.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Fiscal Year</label>
              <Select
                size="sm"
                className="w-full"
                aria-label="Activity year"
                value={String(activityYear)}
                onChange={(v) => setActivityYear(Number(v))}
                options={years.map((y) => ({ value: String(yearKeyToFiscalYear(y)), label: y }))}
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] text-navy-400 uppercase tracking-wider block">Emission Factor</label>
              <Select
                size="sm"
                className="w-full"
                aria-label="Emission factor"
                placeholder="Select an activity type..."
                value={selectedFactorId}
                onChange={setSelectedFactorId}
                options={(['SCOPE_1', 'SCOPE_2', 'SCOPE_3'] as EmissionScopeType[]).flatMap((scope) =>
                  factors
                    .filter((f) => f.scope === scope)
                    .map((f) => ({
                      value: f.id,
                      label: f.name,
                      hint: f.activityUnit,
                      group: scope.replace('_', ' '),
                    })),
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-navy-400 uppercase tracking-wider block">
                Quantity {selectedFactor ? `(${selectedFactor.activityUnit})` : ''}
              </label>
              <input
                type="text"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full px-3 py-2 text-xs font-bold text-navy-950 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-navy-500">
              {livePreview !== null ? (
                <span>Calculated: <strong className="text-navy-950 font-mono">{livePreview.toFixed(4)} tCO2e</strong></span>
              ) : (
                <span className="text-navy-400">Select a factor and enter a quantity to preview the calculation.</span>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddActivityEntry}
              icon={<Plus className="w-3.5 h-3.5" />}
              disabled={!selectedFactorId || isNaN(quantityNum) || quantityNum <= 0}
            >
              Log Entry
            </Button>
          </div>

          {activityEntries.length > 0 && (
            <div className="border-t border-navy-50 pt-4 space-y-2">
              {activityEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs bg-navy-50/30 rounded-xl px-3 py-2">
                  <span className="font-semibold text-navy-800">{e.emissionFactorName} — {e.quantity} {factorById(e.emissionFactorId)?.activityUnit ?? ''}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-navy-950">{e.calculatedTco2e.toFixed(4)} tCO2e</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteActivityEntry(e.id)}
                      className="text-navy-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-navy-50 pt-4">
            {(['SCOPE_1', 'SCOPE_2'] as EmissionScopeType[]).map((scope) => {
              const subtotal = scopeSubtotal(scope);
              if (subtotal <= 0) return null;
              return (
                <React.Fragment key={scope}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApplyToScope(scope)}
                    icon={<FileCheck2 className="w-3.5 h-3.5" />}
                  >
                    Apply {subtotal.toFixed(2)} tCO2e to {scope.replace('_', ' ')} Ledger
                  </Button>
                </React.Fragment>
              );
            })}
            {scopeSubtotal('SCOPE_3') > 0 && (
              <span className="text-[10px] text-navy-400 font-semibold">
                Scope 3 calculated total: <strong className="text-navy-700 font-mono">{scopeSubtotal('SCOPE_3').toFixed(2)} tCO2e</strong> — cross-reference this manually into the appropriate Scope 3 category above (multiple categories exist, so it can't be auto-applied).
              </span>
            )}
          </div>
        </div>
      </div>

      {/* S2 Persistence Controls */}
      <div className="border-t border-navy-100 pt-6 flex items-center justify-between">
        <div className="text-xs text-navy-400 flex items-center space-x-1.5 font-medium">
          <Info className="w-3.5 h-3.5 text-primary-500" />
          <span>Scope 3 categories are flagged for transition relief automatically based on your market classification's relief period.</span>
        </div>

        <div className="flex items-center space-x-3">

          <Button
            variant="primary"
            onClick={handleSaveS2}
            icon={<FileCheck2 className="w-4 h-4" />}
          >
            Save S2 Disclosures
          </Button>
        </div>
      </div>

    </div>
  );
}

