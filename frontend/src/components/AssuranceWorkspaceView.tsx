/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import {
  ShieldCheck, 
  FileCheck, 
  Clock, 
  Download, 
  FileText, 
  AlertTriangle,
  Lock,
  CheckCircle2,
  X, 
  FileArchive, 
  Eye, 
  Check, 
  UserCheck 
} from 'lucide-react';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Select from './ui/Select';
import { indicatorsApi, IndicatorResponse } from '../api/indicatorsApi';
import { assuranceApi, SignOffResponse, AssuranceLevel } from '../api/assuranceApi';
import { exportApi } from '../api/exportApi';
import { ApiError } from '../api/client';
import { fiscalYearKeys } from '../utils/fiscalYears';
import { saveBlob } from '../utils/download';

interface AuditTrailEntry {
  id: string;
  value: number;
  enteredBy: string;
  timestamp: string;
  sourceDocName?: string;
  sourceDocPath?: string;
  comment?: string;
}

interface Indicator {
  id: string;
  name: string;
  unit: string;
  matterId: string;
  category: string;
  values: { [year: string]: number | null };
  target: number | null;
  targetDirection: 'up' | 'down';
  isSectorSpecific?: boolean;
  sectorName?: string;
  history: AuditTrailEntry[];
}

interface SignOffRecord {
  signerName: string;
  signerTitle: string;
  timestamp: string;
  notes: string;
  hash: string;
  assuranceLevel: AssuranceLevel;
  externalAssurerName: string;
  standardReferenced: string;
}

interface LibraryDoc {
  auditEntryId: string;
  docName: string;
  indicatorId: string;
  indicatorName: string;
  uploadedBy: string;
  date: string;
}

// Years supported by the assurance year picker below — used to seed the local values map
// so lookups like `ind.values[focusYear]` are always defined even for years with no data yet.
// Derived, not baked in: see utils/fiscalYears.
const years = fiscalYearKeys();

function toFrontendIndicator(r: IndicatorResponse): Indicator {
  const values: { [year: string]: number | null } = {};
  years.forEach((y) => { values[y] = null; });
  r.values.forEach((v) => { values[`FY${v.fiscalYear}`] = v.value; });

  return {
    id: r.id,
    name: r.name,
    unit: r.unit,
    matterId: r.matterId,
    category: r.category,
    values,
    target: r.effectiveTarget,
    targetDirection: r.effectiveTargetDirection === 'UP' ? 'up' : 'down',
    isSectorSpecific: r.sectorSpecific,
    sectorName: r.sectorCode ?? undefined,
    history: r.history.map((h) => ({
      id: h.id,
      value: h.value,
      enteredBy: h.enteredBy,
      timestamp: new Date(h.enteredAt).toLocaleString(),
      sourceDocName: h.sourceDocName ?? undefined,
      sourceDocPath: h.sourceDocPath ?? undefined,
      comment: h.comment ?? undefined
    }))
  };
}

function fiscalYearNumber(yearKey: string): number {
  return parseInt(yearKey.replace('FY', ''), 10);
}

function mapSignOff(record: SignOffResponse): SignOffRecord {
  return {
    signerName: record.signerName ?? '',
    signerTitle: record.signerTitle ?? '',
    timestamp: record.signedAt ? new Date(record.signedAt).toLocaleString() : '',
    notes: record.notes ?? '',
    hash: record.hash ?? '',
    assuranceLevel: record.assuranceLevel,
    externalAssurerName: record.externalAssurerName ?? '',
    standardReferenced: record.standardReferenced ?? ''
  };
}

const ASSURANCE_LEVEL_LABEL: Record<AssuranceLevel, string> = {
  INTERNAL_REVIEW: 'Internal Review',
  EXTERNAL_LIMITED: 'External — Limited Assurance',
  EXTERNAL_REASONABLE: 'External — Reasonable Assurance'
};

export default function AssuranceWorkspaceView() {
  const { plan } = usePlan();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Page states
  const [focusYear, setFocusYear] = useState<string>('FY2026');
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [signOff, setSignOff] = useState<SignOffRecord | null>(null);
  
  // Interactive Flows
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Signoff form inputs — default to the real logged-in user, not a fabricated identity
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signerNotes, setSignerNotes] = useState('');
  const [assuranceLevel, setAssuranceLevel] = useState<AssuranceLevel>('INTERNAL_REVIEW');
  const [externalAssurerName, setExternalAssurerName] = useState('');
  const [standardReferenced, setStandardReferenced] = useState('ISAE 3000 (Revised)');

  // Export progress states
  const [exportStep, setExportStep] = useState<'confirm' | 'generating' | 'success'>('confirm');
  const [exportProgressText, setExportProgressText] = useState('');
  
  // Load latest indicators from the backend
  const refreshIndicators = () => {
    indicatorsApi.list()
      .then((data) => setIndicators(data.map(toFrontendIndicator)))
      .catch((e) => console.error('Error loading indicators in assurance view:', e));
  };

  useEffect(() => {
    refreshIndicators();
  }, []);

  useEffect(() => {
    // Load sign-off state for selected focusYear
    const fiscalYear = fiscalYearNumber(focusYear);
    assuranceApi.get(fiscalYear)
      .then((record) => {
        setSignOff(record.status === 'SIGNED' ? mapSignOff(record) : null);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          setSignOff(null);
        } else {
          console.error('Error loading sign-off record:', e);
          setSignOff(null);
        }
      });
  }, [focusYear]);

  // Calculations for review summary card
  const totalIndicators = indicators.length;
  const filledCount = indicators.filter(
    ind => ind.values[focusYear] !== null && ind.values[focusYear] !== undefined
  ).length;
  
  const completionPercent = totalIndicators > 0 ? Math.round((filledCount / totalIndicators) * 100) : 0;
  const isReadyForSignOff = completionPercent === 100;

  // Sign-off Actions
  const handleSaveSignOff = (e: React.FormEvent) => {
    e.preventDefault();
    const fiscalYear = fiscalYearNumber(focusYear);
    assuranceApi.signOff(
      fiscalYear, signerName, signerTitle, signerNotes,
      assuranceLevel,
      assuranceLevel !== 'INTERNAL_REVIEW' ? externalAssurerName : undefined,
      assuranceLevel !== 'INTERNAL_REVIEW' ? standardReferenced : undefined
    )
      .then((record) => {
        setSignOff(mapSignOff(record));
        setIsSignOffModalOpen(false);
        showToast(`Successfully recorded sign-off for ${focusYear}!`, 'success');
      })
      .catch((e) => {
        console.error('Error saving sign-off:', e);
        showToast('Failed to record sign-off. Please try again.', 'error');
      });
  };

  const handleResetSignOff = () => {
    const fiscalYear = fiscalYearNumber(focusYear);
    assuranceApi.revoke(fiscalYear)
      .then(() => {
        setSignOff(null);
        showToast('Sign-off signature revoked.', 'success');
      })
      .catch((e) => {
        console.error('Error revoking sign-off:', e);
        showToast('Failed to revoke sign-off. Please try again.', 'error');
      });
  };

  // Gather Supporting Documents from History Logs
  const getSupportingDocuments = (): LibraryDoc[] => {
    const docs: LibraryDoc[] = [];
    indicators.forEach(ind => {
      ind.history.forEach(h => {
        // Only list entries with a real stored evidence file (sourceDocPath), not just a filename label
        if (h.sourceDocName && h.sourceDocPath) {
          docs.push({
            auditEntryId: h.id,
            docName: h.sourceDocName,
            indicatorId: ind.id,
            indicatorName: ind.name,
            uploadedBy: h.enteredBy,
            date: h.timestamp
          });
        }
      });
    });
    return docs;
  };

  const documentsList = getSupportingDocuments();

  const handleDownloadDocument = (doc: LibraryDoc) => {
    indicatorsApi.downloadEvidence(doc.auditEntryId).then((blob) => {
      saveBlob(blob, doc.docName);
    });
  };

  // Export assembly animation trigger
  const handleStartExport = () => {
    setIsExportModalOpen(true);
    setExportStep('confirm');
  };

  const executeExportSequence = async () => {
    setExportStep('generating');
    const fiscalYear = fiscalYearNumber(focusYear);

    try {
      const zip = new JSZip();

      setExportProgressText('Retrieving indicator ledger CSV...');
      const csv = await exportApi.csv(fiscalYear);
      zip.file(`Indicator_Ledger_${focusYear}.csv`, csv);

      setExportProgressText('Compiling audit trail journal...');
      const auditRows = ['Indicator ID,Indicator Name,Fiscal Year,Value,Entered By,Timestamp,Comment'];
      indicators.forEach((ind) => {
        ind.history.forEach((h) => {
          auditRows.push(
            [ind.id, ind.name, fiscalYear, h.value, h.enteredBy, h.timestamp, h.comment ?? '']
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(',')
          );
        });
      });
      zip.file(`Audit_Trail_${focusYear}.csv`, auditRows.join('\n'));

      const evidenceFolder = zip.folder('evidence');
      if (documentsList.length > 0 && evidenceFolder) {
        for (const doc of documentsList) {
          setExportProgressText(`Fetching evidence file: ${doc.docName}...`);
          const blob = await indicatorsApi.downloadEvidence(doc.auditEntryId);
          evidenceFolder.file(doc.docName, blob);
        }
      }

      setExportProgressText('Attaching sign-off signature seal...');
      const record = await assuranceApi.get(fiscalYear).catch(() => null);
      zip.file('signature.json', JSON.stringify({
        fiscalYear,
        status: record?.status ?? 'UNSIGNED',
        signerName: record?.signerName ?? null,
        signerTitle: record?.signerTitle ?? null,
        notes: record?.notes ?? null,
        hash: record?.hash ?? null,
        signedAt: record?.signedAt ?? null,
        assuranceLevel: record?.assuranceLevel ?? null,
        externalAssurerName: record?.externalAssurerName ?? null,
        standardReferenced: record?.standardReferenced ?? null,
      }, null, 2));

      setExportProgressText('Compressing archive...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      saveBlob(zipBlob, `WeSee_Assurance_Package_${focusYear}.zip`);

      setExportStep('success');
      showToast('Assurance package ZIP saved successfully.', 'success');
    } catch (e) {
      console.error('Error building assurance package:', e);
      showToast('Failed to build assurance package.', 'error');
      setExportStep('confirm');
    }
  };

  return (
    <div className="space-y-6">

      {/* 2. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-navy-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-black text-navy-950 uppercase tracking-tight">
              Assurance-Readiness Workspace
            </h3>
            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
              Premium Audit Module
            </span>
          </div>
          <p className="text-xs text-navy-500">
            Audit-ready reporting environment designed to secure data integrity, track sign-offs, and package supporting invoice documentation for external verifiers.
          </p>
        </div>

        {/* Year Select Filter */}
        <div className="flex items-center space-x-2 bg-navy-50/60 px-4 py-2.5 rounded-2xl border border-navy-100/50">
          <span className="text-[10px] text-navy-400 font-extrabold uppercase font-mono">Assurance Year:</span>
          <Select
            size="sm"
            className="w-[140px]"
            aria-label="Fiscal year in focus"
            value={focusYear}
            onChange={setFocusYear}
            options={[
              { value: 'FY2026', label: 'FY2026', hint: 'Focus' },
              { value: 'FY2025', label: 'FY2025' },
              { value: 'FY2024', label: 'FY2024' },
              { value: 'FY2023', label: 'FY2023' },
            ]}
          />
        </div>
      </div>

      {/* 3. REVIEW AND SIGN-OFF INTERFACE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Completion Progress Summary Card */}
        <Card className="lg:col-span-1 bg-white border-navy-100 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <span className="text-[9px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 border border-primary-100 rounded-full font-mono uppercase tracking-widest block w-max">
              Ready Checklist
            </span>
            <h4 className="text-sm font-black text-navy-950 uppercase tracking-wide">
              {focusYear} Metrics Completion
            </h4>
            
            {/* Big Indicator Percentage */}
            <div className="flex items-baseline space-x-2">
              <span className="text-5xl font-black text-navy-950 font-mono tracking-tight">{completionPercent}%</span>
              <span className="text-xs font-semibold text-navy-400">Complete</span>
            </div>

            {/* Micro Progress Bar */}
            <div className="h-2 w-full bg-navy-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isReadyForSignOff ? 'bg-emerald-500' : 'bg-primary-500'}`} 
                style={{ width: `${completionPercent}%` }}
              />
            </div>

            <p className="text-[11px] text-navy-500 leading-normal">
              Logged variables: <strong className="text-navy-900">{filledCount} / {totalIndicators}</strong> indicators filled.
            </p>
          </div>

          <div className="space-y-2 border-t border-navy-50 pt-4">
            {/* If incomplete, show assisted autofill trigger */}
            {!isReadyForSignOff && (
              <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl space-y-2 text-left">
                <div className="flex items-start space-x-2 text-[10px] text-amber-800 leading-normal font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>Some indicators are empty. Real Bursa guidelines require 100% metrics logged prior to internal board sign-off.</span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/indicators')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Complete Missing Indicators</span>
                </button>
              </div>
            )}

            {isReadyForSignOff && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl flex items-center space-x-2 text-[10px] text-emerald-800 font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>All indicator slots filled & lock-ready!</span>
              </div>
            )}
          </div>
        </Card>

        {/* Board Level Verification Signoff */}
        <Card className="lg:col-span-2 bg-white border-navy-100 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 border border-indigo-100 rounded-full font-mono uppercase tracking-widest block">
                Sign-off Record
              </span>
              
              {signOff && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1 uppercase font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{ASSURANCE_LEVEL_LABEL[signOff.assuranceLevel]}</span>
                </span>
              )}
            </div>

            <h4 className="text-sm font-black text-navy-950 uppercase tracking-wide">
              Board-Level Oversight Review
            </h4>

            {signOff ? (
              // Sign-off active view
              <div className="bg-navy-50/50 border border-navy-100 p-5 rounded-2xl space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-100/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-navy-950 block">{signOff.signerName}</span>
                      <span className="text-[10px] text-navy-400 block">{signOff.signerTitle}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-navy-400 block font-mono">Review Timestamp</span>
                    <span className="font-bold text-navy-900 font-mono block">{signOff.timestamp}</span>
                  </div>
                </div>

                {signOff.assuranceLevel !== 'INTERNAL_REVIEW' && (
                  <div className="flex flex-wrap gap-4 text-[10px] font-semibold text-navy-500 bg-white p-3 rounded-xl border border-navy-100">
                    <span>Assurer: <strong className="text-navy-900">{signOff.externalAssurerName || '—'}</strong></span>
                    <span>Standard: <strong className="text-navy-900">{signOff.standardReferenced || '—'}</strong></span>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[10px] text-navy-400 uppercase tracking-wider block font-bold">Review Sign-off Memo:</span>
                  <p className="text-navy-700 italic leading-relaxed font-medium bg-white p-3 rounded-xl border border-navy-100">
                    &ldquo;{signOff.notes}&rdquo;
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-[10px] font-semibold text-navy-500 font-mono bg-indigo-50/50 px-3 py-2 rounded-xl border border-indigo-100/50">
                  <span className="truncate">SHA-256 Hash: <strong className="text-indigo-700 font-bold">{signOff.hash}</strong></span>
                  <span className="text-emerald-600 font-bold shrink-0">✓ Data Integrity Verified</span>
                </div>
              </div>
            ) : (
              // Unsigned view
              <div className="p-8 text-center border border-dashed border-navy-200 bg-slate-50/30 rounded-2xl space-y-3">
                <Lock className="w-8 h-8 text-navy-300 mx-auto" />
                <h5 className="text-xs font-bold text-navy-950">No Active Internal Sign-off</h5>
                <p className="text-[11px] text-navy-400 max-w-sm mx-auto leading-relaxed">
                  Lock reporting records for this cycle to initiate external assurance. Signing warrants that data points are compiled and verified internally.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-navy-50 pt-4 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-[10px] text-navy-400 font-semibold leading-normal">
              * Internal review triggers the assembly schema for EY, PwC, or local certified Malaysian auditors.
            </span>

            {signOff ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetSignOff}
              >
                Revoke Sign-off Signature
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={!isReadyForSignOff}
                onClick={() => {
                  setSignerName(user?.name ?? '');
                  setIsSignOffModalOpen(true);
                }}
                icon={<FileCheck className="w-4 h-4" />}
              >
                Mark as Internally Reviewed
              </Button>
            )}
          </div>
        </Card>

      </div>

      {/* 4. DOCUMENT LIBRARY TABLE */}
      <Card className="bg-white border-navy-100 overflow-hidden shadow-xs" padded="none">
        
        {/* Table Title Bar */}
        <div className="p-6 border-b border-navy-100/50 bg-navy-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-navy-950 uppercase tracking-widest font-mono">
              Supporting Evidence Document Library ({documentsList.length})
            </h4>
            <p className="text-[11px] text-navy-400 leading-normal font-semibold">
              Source file evidence attached to individual indicators during manual log entries or corrections.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleStartExport}
            icon={<FileArchive className="w-4 h-4" />}
          >
            Export Assurance Package
          </Button>
        </div>

        {/* Table Contents */}
        {documentsList.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <FileText className="w-10 h-10 text-navy-300 mx-auto" />
            <h5 className="text-xs font-bold text-navy-950">No uploaded supporting invoices</h5>
            <p className="text-[11px] text-navy-400 max-w-sm mx-auto">
              Supporting utility bills, spreadsheets, and certificates appear here as soon as you upload files to your audit trail manual adjustments inside the Indicators view.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-navy-100 bg-navy-50/10 text-[9px] font-bold text-navy-400 uppercase tracking-widest font-mono">
                  <th className="px-6 py-3.5">Document File Name</th>
                  <th className="px-6 py-3.5">Linked Indicators ID & Name</th>
                  <th className="px-6 py-3.5">Uploaded By</th>
                  <th className="px-6 py-3.5">Upload Date</th>
                  <th className="px-6 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                {documentsList.map((doc, idx) => {
                  const isExcel = doc.docName.endsWith('.xlsx');
                  return (
                    <tr key={idx} className="hover:bg-navy-50/10 transition-colors">
                      {/* Filename with nice type-specific icon */}
                      <td className="px-6 py-4 flex items-center space-x-2.5 font-semibold text-navy-900">
                        {isExcel ? (
                          <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100/50 shrink-0">
                            <FileText className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="p-1.5 bg-rose-50 text-rose-600 rounded border border-rose-100/50 shrink-0">
                            <FileText className="w-4 h-4" />
                          </span>
                        )}
                        <span className="truncate max-w-[220px] font-mono text-xs">{doc.docName}</span>
                      </td>

                      {/* Linked indicator link */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="text-navy-400 font-mono text-[9px] font-bold block uppercase tracking-wider">{doc.indicatorId}</span>
                          <span className="font-extrabold text-navy-950 block leading-tight truncate max-w-[280px]">{doc.indicatorName}</span>
                        </div>
                      </td>

                      {/* Upload Authorizer */}
                      <td className="px-6 py-4 text-navy-600 text-xs">
                        {doc.uploadedBy}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-navy-500 font-mono text-[11px]">
                        {doc.date}
                      </td>

                      {/* Download trigger */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(doc)}
                          className="p-1.5 text-navy-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer transition-colors"
                          title="Download audited proof document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 5. MODAL: MARK AS INTERNALLY REVIEWED */}
      {isSignOffModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity" onClick={() => setIsSignOffModalOpen(false)} />
          
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-navy-100 relative z-10 overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 to-indigo-500" />
            
            <div className="flex items-start justify-between pb-4 border-b border-navy-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-navy-950 uppercase tracking-wider">Execute Board Level Sign-off</h4>
                  <p className="text-[10px] text-navy-400 font-semibold">FY2026 Reporting Cycle Assurance Seal</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSignOffModalOpen(false)}
                className="text-navy-400 hover:text-navy-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSignOff} className="space-y-4 pt-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Signatory Board Representative</label>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-navy-400 uppercase tracking-wider">Designation / Title</label>
                  <input
                    type="text"
                    required
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider">Sign-off Memo & Comments</label>
                <textarea
                  rows={4}
                  required
                  value={signerNotes}
                  onChange={(e) => setSignerNotes(e.target.value)}
                  className="w-full text-xs font-medium text-navy-800 border border-navy-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-navy-400 uppercase tracking-wider">Assurance Level</label>
                <Select
                  className="w-full"
                  aria-label="Assurance level"
                  value={assuranceLevel}
                  onChange={(v) => setAssuranceLevel(v as AssuranceLevel)}
                  options={[
                    { value: 'INTERNAL_REVIEW', label: 'Internal Review' },
                    { value: 'EXTERNAL_LIMITED', label: 'External — Limited Assurance' },
                    { value: 'EXTERNAL_REASONABLE', label: 'External — Reasonable Assurance' },
                  ]}
                />
              </div>

              {assuranceLevel !== 'INTERNAL_REVIEW' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-navy-400 uppercase tracking-wider">External Assurer Name</label>
                    <input
                      type="text"
                      required
                      value={externalAssurerName}
                      onChange={(e) => setExternalAssurerName(e.target.value)}
                      placeholder="e.g. EY, PwC, or local certified auditor"
                      className="w-full px-3 py-2 border border-navy-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-navy-400 uppercase tracking-wider">Standard Referenced</label>
                    <Select
                      className="w-full"
                      aria-label="Standard referenced"
                      value={standardReferenced}
                      onChange={setStandardReferenced}
                      options={[
                        { value: 'ISAE 3000 (Revised)', label: 'ISAE 3000 (Revised)' },
                        { value: 'ISSA 5000', label: 'ISSA 5000' },
                      ]}
                    />
                  </div>
                </div>
              )}

              <div className="bg-navy-50/50 p-3.5 rounded-2xl border border-navy-100 text-[10px] text-navy-500 leading-normal font-normal">
                By sealing this cycle, you verify that all indicators and transition reliefs are locked, providing a comprehensive data log trail matching MY-Bursa Listing regulations.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setIsSignOffModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" icon={<ShieldCheck className="w-4 h-4" />}>
                  Sign and Lock Cycle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: EXPORT ASSURANCE PACKAGE */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity" onClick={() => setIsExportModalOpen(false)} />
          
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-navy-100 relative z-10 overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
            
            <div className="flex items-start justify-between pb-4 border-b border-navy-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-navy-950 uppercase tracking-wider">Assurance Package Compiler</h4>
                  <p className="text-[10px] text-navy-400 font-semibold">{focusYear} Secure Assembly Output</p>
                </div>
              </div>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="text-navy-400 hover:text-navy-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Confirmation */}
            {exportStep === 'confirm' && (
              <div className="space-y-4 pt-4 text-xs">
                <p className="text-navy-500 leading-relaxed font-semibold">
                  Assemble a complete audit-ready package ZIP file, including:
                </p>

                <div className="space-y-2.5 bg-navy-50/50 p-4 rounded-2xl border border-navy-100/50 font-bold text-navy-700">
                  <div className="flex items-center space-x-2.5 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Complete Indicator Spreadsheet Ledger (.csv)</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Full Historic Audit Trail CSV Journal (.csv)</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>All supporting PDF & Spreadsheet Invoices ({documentsList.length} files)</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Cryptographic SHA256 Signature Seal Cert (.json)</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setIsExportModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={executeExportSequence} icon={<FileArchive className="w-4 h-4" />}>
                    Compile & Export Package
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Generating Loading Screen */}
            {exportStep === 'generating' && (
              <div className="p-8 text-center space-y-4 pt-4 text-xs font-semibold">
                {/* Simulated Loading Spinner */}
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto" />
                <p className="text-navy-950 font-black tracking-wide uppercase font-mono text-[10px]">Generating Secure Ledger Bundle</p>
                <p className="text-navy-400 font-medium font-mono text-[11px] animate-pulse bg-navy-50 py-2.5 rounded-xl border border-navy-100/30">
                  {exportProgressText}
                </p>
              </div>
            )}

            {/* Step 3: Success Screen */}
            {exportStep === 'success' && (
              <div className="text-center p-6 space-y-4 pt-4 text-xs font-semibold">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                
                <div className="space-y-1">
                  <h5 className="text-sm font-black text-navy-950 uppercase tracking-wider">Assurance Package Complete!</h5>
                  <p className="text-navy-400 leading-relaxed font-medium">
                    Assembly completed and compiled. Secured archive is saved as:
                  </p>
                  <p className="text-primary-700 bg-primary-50 px-3 py-1.5 rounded-xl border border-primary-100 font-mono text-xs inline-block">
                    WeSee_Assurance_Package_{focusYear}.zip
                  </p>
                </div>

                <div className="flex justify-center pt-2">
                  <Button variant="primary" size="sm" onClick={() => setIsExportModalOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
