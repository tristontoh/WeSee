/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  CheckCircle2,
  HelpCircle,
  Info,
  Download,
  Users,
  ShieldCheck,
  Printer,
  FileCheck,
  Search,
  AlertCircle,
  Building,
  Plus,
  Trash2,
  FileText,
  Sparkles,
  CalendarClock
} from 'lucide-react';
import { usePlan, PlanType } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { canAccess, MANAGEMENT_ROLES } from '../permissions';
import Button from './ui/Button';
import Card from './ui/Card';
import { useApplicableMatters } from '../hooks/useApplicableMatters';
import { governanceApi, OversightLevel as BackendOversightLevel } from '../api/governanceApi';
import { companyApi } from '../api/companyApi';
import { compliancePolicyApi, CompliancePolicyResponse } from '../api/compliancePolicyApi';
import { COMPLIANCE_STATUS_STYLES } from '../utils/complianceStatus';
import DraftWithAiButton from './ai/DraftWithAiButton';
import Select from './ui/Select';

// Types for Governance structure
interface GovernanceCardData {
  title: string;
  role: string;
  description: string;
}

interface GovernanceStructure {
  oversight: GovernanceCardData;
  strategic: GovernanceCardData;
  implementation: GovernanceCardData;
}

type FrontendLevel = 'oversight' | 'strategic' | 'implementation';

interface MatterOwnerRow {
  matterId: string;
  ownerName: string;
  oversightLevel: FrontendLevel;
  notes: string;
}

const LEVEL_TO_BACKEND: Record<FrontendLevel, BackendOversightLevel> = {
  oversight: 'OVERSIGHT',
  strategic: 'STRATEGIC',
  implementation: 'IMPLEMENTATION'
};
const LEVEL_FROM_BACKEND: Record<BackendOversightLevel, FrontendLevel> = {
  OVERSIGHT: 'oversight',
  STRATEGIC: 'strategic',
  IMPLEMENTATION: 'implementation'
};

const DEFAULT_STRUCTURE: GovernanceStructure = {
  oversight: { title: 'Oversight (Board-Level)', role: '', description: '' },
  strategic: { title: 'Strategic Management', role: '', description: '' },
  implementation: { title: 'Day-to-day Implementation', role: '', description: '' }
};

export default function GovernanceView() {
  const { plan } = usePlan();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { matters: activeMatters } = useApplicableMatters();
  const canManageCompliance = canAccess(user?.role, MANAGEMENT_ROLES);

  // 1. Core state — backed by the real governance API
  const [structure, setStructure] = useState<GovernanceStructure>(DEFAULT_STRUCTURE);
  const [ownershipData, setOwnershipData] = useState<Record<string, MatterOwnerRow>>({});
  const [compliancePolicies, setCompliancePolicies] = useState<CompliancePolicyResponse[]>([]);

  const refreshCompliancePolicies = () => {
    compliancePolicyApi.list().then(setCompliancePolicies).catch((e) => console.error(e));
  };

  useEffect(() => {
    governanceApi.getStructure().then((levels) => {
      setStructure((prev) => {
        const updated = { ...prev };
        levels.forEach((l) => {
          const key = LEVEL_FROM_BACKEND[l.level];
          updated[key] = { ...updated[key], role: l.roleTitle, description: l.description ?? '' };
        });
        return updated;
      });
    });

    governanceApi.getOwnership().then((rows) => {
      const mapped: Record<string, MatterOwnerRow> = {};
      rows.forEach((r) => {
        mapped[r.matterId] = {
          matterId: r.matterId,
          ownerName: r.ownerName,
          oversightLevel: LEVEL_FROM_BACKEND[r.oversightLevel],
          notes: r.notes ?? ''
        };
      });
      setOwnershipData(mapped);
    });

    companyApi.listUsers().then((users) => setTeamMembers(users.map((u) => u.name))).catch((e) => console.error(e));
    refreshCompliancePolicies();
  }, []);

  const handleMarkReviewed = (id: string) => {
    compliancePolicyApi.markReviewed(id).then(refreshCompliancePolicies).catch((e) => console.error(e));
  };

  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyReviewCycle, setNewPolicyReviewCycle] = useState('12');
  const [confirmDeletePolicyId, setConfirmDeletePolicyId] = useState<string | null>(null);

  const handleCreatePolicy = () => {
    const name = newPolicyName.trim();
    const reviewCycleMonths = parseInt(newPolicyReviewCycle, 10);
    if (!name || isNaN(reviewCycleMonths) || reviewCycleMonths < 1) return;
    compliancePolicyApi.create({ name, reviewCycleMonths }).then(() => {
      setNewPolicyName('');
      setNewPolicyReviewCycle('12');
      refreshCompliancePolicies();
    }).catch((e) => console.error(e));
  };

  const handleDeletePolicy = (id: string) => {
    compliancePolicyApi.remove(id).then(refreshCompliancePolicies).catch((e) => console.error(e)).finally(() => setConfirmDeletePolicyId(null));
  };

  // Track save indicators for each row or input to give high-fidelity visual feedback
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});

  // Modal for print-friendly Governance Summary Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const handleDownloadReport = () => {
    setIsDownloadingReport(true);
    governanceApi.downloadReport()
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'WeSee_Governance_Report.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => showToast('Failed to generate the governance report PDF. Please try again.', 'error'))
      .finally(() => setIsDownloadingReport(false));
  };

  // Real company users for the searchable owner select (free-text suggestions only — the
  // backend treats ownerName as free text, there is no hard FK to a user)
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  // Search filter query for dropdowns
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const triggerSaveIndicator = (key: string) => {
    setSavedStatus(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setSavedStatus(prev => ({ ...prev, [key]: false }));
    }, 1500);
  };

  const handleStructureChange = (level: keyof GovernanceStructure, field: 'role' | 'description', value: string) => {
    setStructure(prev => {
      const updated = {
        ...prev,
        [level]: {
          ...prev[level],
          [field]: value
        }
      };
      governanceApi.updateLevel(LEVEL_TO_BACKEND[level], updated[level].role, updated[level].description);
      return updated;
    });
    triggerSaveIndicator(level);
  };

  const handleOwnershipChange = (matterId: string, field: keyof MatterOwnerRow, value: any) => {
    setOwnershipData(prev => {
      const currentRow: MatterOwnerRow = prev[matterId] || {
        matterId,
        ownerName: '',
        oversightLevel: 'oversight',
        notes: ''
      };

      const updatedRow = {
        ...currentRow,
        [field]: value
      };

      const updated = {
        ...prev,
        [matterId]: updatedRow
      };

      governanceApi.updateOwnership(matterId, updatedRow.ownerName, LEVEL_TO_BACKEND[updatedRow.oversightLevel], updatedRow.notes);
      return updated;
    });
    triggerSaveIndicator(matterId + '-' + field);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownRow(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-8 w-full pb-16 font-sans">

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-navy-100/40">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-primary-600 mb-1">
            <span className="px-2 py-0.5 bg-primary-50 rounded-md">Section 17A MACC</span>
            <span>•</span>
            <span>Gender Quotas</span>
            <span>•</span>
            <span>Bursa Listing Rules</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-950">
            ESG Governance Documentation
          </h2>
          <p className="text-xs text-navy-500 mt-1">
            Establish board oversight hierarchies and map exact compliance owners for environmental and social disclosures.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowExportModal(true)}
            icon={<Printer className="w-4 h-4 text-primary-600" />}
          >
            Export Governance Summary
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadReport}
            icon={<Download className="w-4 h-4" />}
            disabled={isDownloadingReport}
          >
            {isDownloadingReport ? 'Generating…' : 'Download PDF Report'}
          </Button>
        </div>
      </div>

      {/* SECTION 1: GOVERNANCE STRUCTURE CARD COLUMNS (3 Side-by-side Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Corporate Oversight Levels</h3>
          </div>
          <span className="text-[10px] text-navy-400 font-mono font-bold">Auto-saves on input edit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Card 1: Oversight */}
          <Card className="bg-white border-navy-100 p-5 space-y-4 relative flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100 uppercase tracking-widest font-mono">
                  Level 1
                </span>
                {savedStatus['oversight'] && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1 animate-fade-in font-mono">
                    <Check className="w-3 h-3" />
                    <span>Saved</span>
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-navy-400 uppercase tracking-wider block mb-1">
                  {structure.oversight.title}
                </h4>
                <input
                  type="text"
                  value={structure.oversight.role}
                  onChange={(e) => handleStructureChange('oversight', 'role', e.target.value)}
                  placeholder="e.g. Board Sustainability Committee"
                  className="w-full px-3 py-2 text-xs font-extrabold text-navy-950 bg-navy-50/40 border border-navy-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-bold text-navy-400 uppercase tracking-wider">Responsibility Charter</label>
                  <DraftWithAiButton
                    draftType="governance-oversight-description"
                    context={{ roleTitle: structure.oversight.role || 'Board Sustainability Committee', sector: user?.sector ?? '', marketClassification: user?.market ?? '' }}
                    onDraft={(text) => handleStructureChange('oversight', 'description', text)}
                  />
                </div>
                <textarea
                  value={structure.oversight.description}
                  onChange={(e) => handleStructureChange('oversight', 'description', e.target.value)}
                  placeholder="Enter charter or oversight responsibility details..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs text-navy-700 bg-navy-50/40 border border-navy-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-primary-500 outline-none transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
            <div className="text-[10px] text-navy-400 font-semibold bg-navy-50/50 p-2.5 rounded-xl border border-navy-100/30 mt-2 block">
              Used in table as option: <strong className="text-navy-950">{structure.oversight.role || 'Board level'}</strong>
            </div>
          </Card>

          {/* Card 2: Strategic */}
          <Card className="bg-white border-navy-100 p-5 space-y-4 relative flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-100 uppercase tracking-widest font-mono">
                  Level 2
                </span>
                {savedStatus['strategic'] && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1 animate-fade-in font-mono">
                    <Check className="w-3 h-3" />
                    <span>Saved</span>
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-navy-400 uppercase tracking-wider block mb-1">
                  {structure.strategic.title}
                </h4>
                <input
                  type="text"
                  value={structure.strategic.role}
                  onChange={(e) => handleStructureChange('strategic', 'role', e.target.value)}
                  placeholder="e.g. Chief Sustainability Officer"
                  className="w-full px-3 py-2 text-xs font-extrabold text-navy-950 bg-navy-50/40 border border-navy-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-bold text-navy-400 uppercase tracking-wider">Responsibility Charter</label>
                  <DraftWithAiButton
                    draftType="governance-strategic-description"
                    context={{ roleTitle: structure.strategic.role || 'Chief Sustainability Officer', sector: user?.sector ?? '', marketClassification: user?.market ?? '' }}
                    onDraft={(text) => handleStructureChange('strategic', 'description', text)}
                  />
                </div>
                <textarea
                  value={structure.strategic.description}
                  onChange={(e) => handleStructureChange('strategic', 'description', e.target.value)}
                  placeholder="Enter strategic management scope..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs text-navy-700 bg-navy-50/40 border border-navy-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-primary-500 outline-none transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
            <div className="text-[10px] text-navy-400 font-semibold bg-navy-50/50 p-2.5 rounded-xl border border-navy-100/30 mt-2 block">
              Used in table as option: <strong className="text-navy-950">{structure.strategic.role || 'CSO level'}</strong>
            </div>
          </Card>

          {/* Card 3: Implementation */}
          <Card className="bg-white border-navy-100 p-5 space-y-4 relative flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100 uppercase tracking-widest font-mono">
                  Level 3
                </span>
                {savedStatus['implementation'] && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1 animate-fade-in font-mono">
                    <Check className="w-3 h-3" />
                    <span>Saved</span>
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-navy-400 uppercase tracking-wider block mb-1">
                  {structure.implementation.title}
                </h4>
                <input
                  type="text"
                  value={structure.implementation.role}
                  onChange={(e) => handleStructureChange('implementation', 'role', e.target.value)}
                  placeholder="e.g. ESG Coordinator / Lead"
                  className="w-full px-3 py-2 text-xs font-extrabold text-navy-950 bg-navy-50/40 border border-navy-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-bold text-navy-400 uppercase tracking-wider">Responsibility Charter</label>
                  <DraftWithAiButton
                    draftType="governance-implementation-description"
                    context={{ roleTitle: structure.implementation.role || 'ESG Coordinator', sector: user?.sector ?? '', marketClassification: user?.market ?? '' }}
                    onDraft={(text) => handleStructureChange('implementation', 'description', text)}
                  />
                </div>
                <textarea
                  value={structure.implementation.description}
                  onChange={(e) => handleStructureChange('implementation', 'description', e.target.value)}
                  placeholder="Enter day-to-day operational scope..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs text-navy-700 bg-navy-50/40 border border-navy-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-primary-500 outline-none transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
            <div className="text-[10px] text-navy-400 font-semibold bg-navy-50/50 p-2.5 rounded-xl border border-navy-100/30 mt-2 block">
              Used in table as option: <strong className="text-navy-950">{structure.implementation.role || 'Operational level'}</strong>
            </div>
          </Card>

        </div>
      </div>

      {/* SECTION 1B: REGULATORY COMPLIANCE TRACKER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarClock className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Regulatory Compliance Tracker</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {compliancePolicies.map((p) => {
            const style = COMPLIANCE_STATUS_STYLES[p.status];
            return (
              <Card key={p.id} className="bg-white border-navy-100 p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-navy-950 leading-snug">{p.name}</h4>
                  <span className={`text-[9px] font-bold border rounded-md px-2 py-0.5 shrink-0 uppercase tracking-wider ${style.className}`}>
                    {style.label}
                  </span>
                </div>
                {p.description && (
                  <p className="text-[10px] text-navy-500 leading-relaxed">{p.description}</p>
                )}
                <div className="text-[10px] text-navy-400 space-y-0.5 font-mono">
                  <div>Last reviewed: {p.lastReviewedAt ? new Date(p.lastReviewedAt).toLocaleDateString() : 'Never'}</div>
                  <div>Next due: {p.nextReviewDueAt ? new Date(p.nextReviewDueAt).toLocaleDateString() : '—'}</div>
                </div>
                {canManageCompliance && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleMarkReviewed(p.id)}
                      className="flex-1 text-[11px] font-bold"
                      icon={<Check className="w-3.5 h-3.5" />}
                    >
                      Mark as Reviewed
                    </Button>
                    {!p.mandatory && (
                      confirmDeletePolicyId === p.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDeletePolicy(p.id)}
                            className="px-2 py-1.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePolicyId(null)}
                            className="px-2 py-1.5 text-[10px] font-bold text-navy-500 hover:text-navy-700 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePolicyId(p.id)}
                          className="p-2 text-navy-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors shrink-0"
                          title="Remove policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {canManageCompliance && (
          <div className="bg-white border border-dashed border-navy-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              placeholder="Add a custom compliance policy (e.g. Data Protection Policy)..."
              value={newPolicyName}
              onChange={(e) => setNewPolicyName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-semibold text-navy-950 bg-navy-50/40 border border-navy-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-primary-500 outline-none"
            />
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Review cycle (months)"
                value={newPolicyReviewCycle}
                onChange={(e) => setNewPolicyReviewCycle(e.target.value)}
                className="w-40 px-3 py-2 text-xs font-semibold text-navy-950 bg-navy-50/40 border border-navy-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-primary-500 outline-none"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCreatePolicy}
                disabled={!newPolicyName.trim()}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Policy
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: MATTER OWNERSHIP TABLE */}
      <div className="space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Disclosure Matters Ownership Assignment</h3>
          </div>

          <div className="text-xs text-navy-400 font-semibold bg-white px-3.5 py-1.5 rounded-xl border border-navy-100/50 shadow-sm flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Plan Source: <strong className="uppercase font-mono text-primary-600">{plan}</strong></span>
          </div>
        </div>

        {/* Outer table wrapper */}
        <Card className="bg-white border-navy-100 p-0 overflow-hidden" padded="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-navy-100 bg-navy-50/50 text-[10px] font-bold text-navy-400 uppercase tracking-wider font-mono">
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Sustainability Matter</th>
                  <th className="px-6 py-3.5 min-w-[220px]">Assigned Owner (Name or Role)</th>
                  <th className="px-6 py-3.5 min-w-[200px]">Oversight Level</th>
                  <th className="px-6 py-3.5">Implementation Notes</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 text-xs">
                {activeMatters.map((matter, idx) => {
                  const mId = matter.id;
                  const row = ownershipData[mId] || {
                    matterId: mId,
                    ownerName: '',
                    oversightLevel: 'oversight' as FrontendLevel,
                    notes: ''
                  };

                  const isOwnerSaved = savedStatus[`${mId}-ownerName`];
                  const isLevelSaved = savedStatus[`${mId}-oversightLevel`];
                  const isNotesSaved = savedStatus[`${mId}-notes`];
                  const isAnySaved = isOwnerSaved || isLevelSaved || isNotesSaved;

                  return (
                    <tr key={mId} className="hover:bg-navy-50/20 transition-all group">

                      {/* Column 1: Category */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold border tracking-wider uppercase ${
                          matter.category === 'Environmental' ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' :
                          matter.category === 'Social' ? 'bg-blue-50 text-blue-700 border-blue-100/50' :
                          'bg-purple-50 text-purple-700 border-purple-100/50'
                        }`}>
                          {matter.category}
                        </span>
                      </td>

                      {/* Column 2: Matter Name */}
                      <td className="px-6 py-4.5">
                        <div className="max-w-xs space-y-0.5">
                          <span className="font-bold text-navy-950 block leading-tight">{matter.name}</span>
                          <span className="text-[10px] text-navy-400 line-clamp-1 group-hover:line-clamp-none transition-all duration-150 cursor-help" title={matter.description}>
                            {matter.description}
                          </span>
                        </div>
                      </td>

                      {/* Column 3: Searchable Combobox/Select for Owner */}
                      <td className="px-6 py-4.5 relative">
                        <div className="relative">
                          <div className="flex items-center bg-navy-50/40 hover:bg-navy-50 border border-navy-100 rounded-xl px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-primary-500 focus-within:bg-white transition-all">
                            <input
                              type="text"
                              value={row.ownerName}
                              onChange={(e) => {
                                handleOwnershipChange(mId, 'ownerName', e.target.value);
                                setSearchQueries(prev => ({ ...prev, [mId]: e.target.value }));
                                setActiveDropdownRow(mId);
                              }}
                              onFocus={() => {
                                setActiveDropdownRow(mId);
                                setSearchQueries(prev => ({ ...prev, [mId]: row.ownerName }));
                              }}
                              placeholder="Type name or select team member..."
                              className="w-full text-xs font-semibold text-navy-900 bg-transparent outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setActiveDropdownRow(activeDropdownRow === mId ? null : mId)}
                              className="text-navy-400 hover:text-navy-600"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Float dropdown */}
                          {activeDropdownRow === mId && (
                            <div
                              ref={dropdownRef}
                              className="absolute left-0 right-0 mt-1 bg-white border border-navy-100 shadow-xl rounded-xl z-50 py-1.5 max-h-48 overflow-y-auto"
                            >
                              <div className="px-3 py-1 text-[9px] font-bold text-navy-400 uppercase tracking-widest border-b border-navy-50 mb-1">
                                Sourced Team Members
                              </div>
                              {teamMembers
                                .filter(member =>
                                  !searchQueries[mId] ||
                                  member.toLowerCase().includes(searchQueries[mId].toLowerCase())
                                )
                                .map((member) => (
                                  <button
                                    key={member}
                                    type="button"
                                    onClick={() => {
                                      handleOwnershipChange(mId, 'ownerName', member);
                                      setActiveDropdownRow(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-navy-700 hover:bg-navy-50 transition-colors"
                                  >
                                    {member}
                                  </button>
                                ))
                              }
                              {teamMembers.filter(member =>
                                !searchQueries[mId] ||
                                member.toLowerCase().includes(searchQueries[mId].toLowerCase())
                              ).length === 0 && (
                                <div className="px-3 py-2 text-[10px] text-navy-400 font-medium">
                                  No team member matches. Press Enter or leave input as free-text role name.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Oversight Level Selector */}
                      <td className="px-6 py-4.5">
                        <Select
                          size="sm"
                          className="w-full"
                          aria-label="Oversight level"
                          value={row.oversightLevel}
                          onChange={(v) => handleOwnershipChange(mId, 'oversightLevel', v as any)}
                          options={[
                            { value: 'oversight', label: `1. Oversight — ${structure.oversight.role || 'Board level'}` },
                            { value: 'strategic', label: `2. Strategic — ${structure.strategic.role || 'CSO level'}` },
                            { value: 'implementation', label: `3. Operation — ${structure.implementation.role || 'Lead level'}` },
                          ]}
                        />
                      </td>

                      {/* Column 5: Implementation Notes */}
                      <td className="px-6 py-4.5">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) => handleOwnershipChange(mId, 'notes', e.target.value)}
                            placeholder="e.g. Audit schedule details..."
                            className="w-full px-2.5 py-1.5 text-xs font-medium text-navy-700 bg-navy-50/40 hover:bg-navy-50 border border-navy-100 focus:bg-white focus:ring-1 focus:ring-primary-500 rounded-xl outline-none transition-all"
                          />
                          <DraftWithAiButton
                            draftType="governance-ownership-notes"
                            context={{ matterName: matter.name, ownerName: row.ownerName || 'Unassigned', oversightLevel: row.oversightLevel }}
                            onDraft={(text) => handleOwnershipChange(mId, 'notes', text)}
                          />
                        </div>
                      </td>

                      {/* Column 6: Save Indicator */}
                      <td className="px-4 py-4.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center min-w-[40px] h-5">
                          {isAnySaved ? (
                            <span className="text-emerald-500 inline-block animate-bounce" title="Auto-saved">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-navy-300 font-mono select-none">
                              Saved
                            </span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* BOTTOM DISCLAIMER ADVISORY */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-start space-x-3.5">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-navy-950">Double Materiality Compliance Advisory</h4>
          <p className="text-[11px] text-navy-600 leading-relaxed">
            Assigning specific operational personnel to each material ESG issue is a primary pre-requisite for both the **Joint Climate Committee (JCC)** reporting and standard **Bursa Malaysia Sustainability Statements**. These fields link directly to the **Reports and Export** modules.
          </p>
        </div>
      </div>


      {/* ========================================================
          EXPORT SUMMARY MODAL
         ======================================================== */}
      {showExportModal && (
        <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-navy-100 shadow-2xl max-w-4xl w-full p-8 space-y-6 animate-fade-in my-8 max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-navy-100">
              <div className="flex items-center space-x-2.5">
                <FileCheck className="w-5 h-5 text-primary-600" />
                <h3 className="text-base font-extrabold text-navy-950">Governance Summary Export Report</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-navy-400 hover:text-navy-600 text-sm font-mono font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Print Friendly Preview area */}
            <div className="p-8 bg-slate-50 rounded-2xl border border-navy-50 space-y-8 text-navy-900 overflow-y-auto print-sheet">

              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-navy-900 pb-5">
                <div>
                  <h1 className="text-xl font-black text-navy-950 uppercase tracking-tight">ESG GOVERNANCE FRAMEWORK</h1>
                  <p className="text-xs text-navy-500 font-bold mt-1">WESEE ASSURANCE SYSTEM DOCUMENT</p>
                  <p className="text-[10px] text-navy-400 font-medium font-mono">Captured: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 bg-primary-100 text-primary-950 font-extrabold text-[10px] rounded uppercase font-mono tracking-wider border border-primary-200">
                    Plan: {plan === 'issuer-ready' ? 'Bursa Common Matters' : 'SEDG Standard'}
                  </span>
                  <div className="text-[10px] text-navy-400 font-bold mt-2 font-sans">WORKSPACE: WESEE HQ</div>
                </div>
              </div>

              {/* Oversight Levels */}
              <div className="space-y-4">
                <h2 className="text-xs font-black text-navy-950 uppercase tracking-widest border-l-4 border-primary-500 pl-2">
                  1. CORPORATE OVERSIGHT STRUCTURE
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-4.5 rounded-xl border border-navy-100">
                    <span className="text-[9px] font-black font-mono text-rose-600 block uppercase">Board Level</span>
                    <h3 className="text-xs font-black text-navy-950 mt-1 mb-2">{structure.oversight.role || 'Not defined'}</h3>
                    <p className="text-[10px] text-navy-600 leading-relaxed font-medium">{structure.oversight.description || 'No charter details provided.'}</p>
                  </div>

                  <div className="bg-white p-4.5 rounded-xl border border-navy-100">
                    <span className="text-[9px] font-black font-mono text-purple-600 block uppercase">Strategic Level</span>
                    <h3 className="text-xs font-black text-navy-950 mt-1 mb-2">{structure.strategic.role || 'Not defined'}</h3>
                    <p className="text-[10px] text-navy-600 leading-relaxed font-medium">{structure.strategic.description || 'No strategic charter details provided.'}</p>
                  </div>

                  <div className="bg-white p-4.5 rounded-xl border border-navy-100">
                    <span className="text-[9px] font-black font-mono text-blue-600 block uppercase">Implementation Level</span>
                    <h3 className="text-xs font-black text-navy-950 mt-1 mb-2">{structure.implementation.role || 'Not defined'}</h3>
                    <p className="text-[10px] text-navy-600 leading-relaxed font-medium">{structure.implementation.description || 'No operational scope details provided.'}</p>
                  </div>
                </div>
              </div>

              {/* Ownership Matrix */}
              <div className="space-y-4">
                <h2 className="text-xs font-black text-navy-950 uppercase tracking-widest border-l-4 border-primary-500 pl-2">
                  2. SUSTAINABILITY MATTER OWNERSHIP INDEX
                </h2>

                <div className="bg-white border border-navy-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-navy-50/70 border-b border-navy-100 text-[9px] text-navy-400 uppercase font-mono font-bold">
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2">Sustainability Matter</th>
                        <th className="px-4 py-2">Personnel Owner</th>
                        <th className="px-4 py-2">Oversight Structure</th>
                        <th className="px-4 py-2">Implementation / Compliance Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-50">
                      {activeMatters.map((matter) => {
                        const row = ownershipData[matter.id] || {
                          ownerName: 'Unassigned',
                          oversightLevel: 'strategic' as FrontendLevel,
                          notes: ''
                        };

                        let oversightRoleText = '';
                        if (row.oversightLevel === 'oversight') oversightRoleText = structure.oversight.role;
                        else if (row.oversightLevel === 'strategic') oversightRoleText = structure.strategic.role;
                        else oversightRoleText = structure.implementation.role;

                        return (
                          <tr key={matter.id} className="hover:bg-navy-50/10">
                            <td className="px-4 py-2 font-bold uppercase">{matter.category}</td>
                            <td className="px-4 py-2">
                              <span className="font-extrabold text-navy-950 block">{matter.name}</span>
                              <span className="text-[8px] text-navy-400 block truncate max-w-xs">{matter.description}</span>
                            </td>
                            <td className="px-4 py-2 font-bold text-navy-800">{row.ownerName || 'Unassigned'}</td>
                            <td className="px-4 py-2">
                              <span className="font-bold text-navy-900 block capitalize">{row.oversightLevel}</span>
                              <span className="text-[8.5px] text-navy-400 block">{oversightRoleText}</span>
                            </td>
                            <td className="px-4 py-2 text-navy-500 italic font-medium">{row.notes || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Controls */}
            <div className="flex justify-end gap-3 pt-4 border-t border-navy-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowExportModal(false)}
              >
                Close Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                icon={<Printer className="w-4 h-4" />}
              >
                Print Report
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
