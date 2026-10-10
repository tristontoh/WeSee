/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, Plus, Trash2, Users, Building, Droplets, Briefcase } from 'lucide-react';
import {
  denominatorApi,
  ApiError,
  type AnnualFigure,
  type AnnualFigureKey,
  type BoardMemberDto,
  type FigureCatalogueEntry,
  type FigureGroup,
  type ShareCapitalDto,
  type ShareholdingDto,
} from '../api';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';
import Card from './ui/Card';

/**
 * The figures the ratio indicators divide by. Grouped the way a reporting team divides the work,
 * and rendered from the server's own catalogue so this screen cannot drift from the enum the
 * formulas read.
 */

const GROUP_ORDER: FigureGroup[] = ['FINANCIAL', 'WORKFORCE', 'SITES_AND_SUPPLIERS', 'WATER'];

const GROUP_META: Record<FigureGroup, { title: string; blurb: string; icon: React.ReactNode }> = {
  FINANCIAL: {
    title: 'Financial and operational',
    blurb: 'Revenue and output are the denominators every intensity metric divides by.',
    icon: <Briefcase className="w-4 h-4 text-primary-600" />,
  },
  WORKFORCE: {
    title: 'Workforce',
    blurb: 'Headcount, hours and training. These unlock the social indicators.',
    icon: <Users className="w-4 h-4 text-primary-600" />,
  },
  SITES_AND_SUPPLIERS: {
    title: 'Sites and suppliers',
    blurb: 'Counts of what you operate and who you buy from, and how much of each you have assessed.',
    icon: <Building className="w-4 h-4 text-primary-600" />,
  },
  WATER: {
    title: 'Water',
    blurb: 'Recycled volume. Fresh water intake is already recorded as an indicator.',
    icon: <Droplets className="w-4 h-4 text-primary-600" />,
  },
};

function errorMessage(e: unknown): string {
  // FigureValidator's messages are written for the person who typed the wrong number — show them
  // verbatim rather than replacing them with a generic failure.
  if (e instanceof ApiError && e.message) return e.message;
  return e instanceof Error ? e.message : 'Something went wrong';
}

const DenominatorsView: React.FC = () => {
  const { showToast } = useToast();
  const thisYear = new Date().getFullYear();

  const [fiscalYear, setFiscalYear] = useState(thisYear);
  const [catalogue, setCatalogue] = useState<FigureCatalogueEntry[]>([]);
  const [figures, setFigures] = useState<Record<string, AnnualFigure>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [board, setBoard] = useState<BoardMemberDto[]>([]);
  const [capital, setCapital] = useState<ShareCapitalDto | null>(null);
  const [holdings, setHoldings] = useState<ShareholdingDto[]>([]);
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(
    () => Array.from({ length: 8 }, (_, i) => thisYear + 1 - i),
    [thisYear],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, figs, members, cap, holds] = await Promise.all([
        denominatorApi.catalogue(),
        denominatorApi.listFigures(fiscalYear),
        denominatorApi.listBoardMembers(fiscalYear),
        denominatorApi.getShareCapital(fiscalYear),
        denominatorApi.listHoldings(fiscalYear),
      ]);
      setCatalogue(cat);
      const byKey: Record<string, AnnualFigure> = {};
      const asDrafts: Record<string, string> = {};
      figs.forEach((f) => {
        byKey[f.figureKey] = f;
        asDrafts[f.figureKey] = String(f.value);
      });
      setFigures(byKey);
      setDrafts(asDrafts);
      setBoard(members);
      setCapital(cap);
      setHoldings(holds);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveFigure = async (key: AnnualFigureKey) => {
    const raw = drafts[key];
    if (raw === undefined || raw.trim() === '') {
      // Clearing the box removes the figure rather than storing a zero, which would be a claim.
      if (figures[key]) {
        try {
          await denominatorApi.deleteFigure(fiscalYear, key);
          showToast('Figure removed', 'success');
          void load();
        } catch (e) {
          showToast(errorMessage(e), 'error');
        }
      }
      return;
    }
    const value = Number(raw);
    if (Number.isNaN(value)) {
      showToast('That is not a number', 'error');
      return;
    }
    try {
      const saved = await denominatorApi.setFigure(fiscalYear, key, value);
      setFigures((prev) => ({ ...prev, [key]: saved }));
      showToast(`${saved.label} saved`, 'success');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  const addDirector = async () => {
    const name = window.prompt('Director name');
    if (!name || !name.trim()) return;
    try {
      await denominatorApi.addBoardMember(fiscalYear, { name: name.trim(), independent: false });
      void load();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  const updateDirector = async (m: BoardMemberDto, patch: Partial<BoardMemberDto>) => {
    try {
      await denominatorApi.updateBoardMember(fiscalYear, m.id, {
        name: patch.name ?? m.name,
        roleTitle: patch.roleTitle !== undefined ? patch.roleTitle : m.roleTitle,
        independent: patch.independent !== undefined ? patch.independent : m.independent,
        gender: patch.gender !== undefined ? patch.gender : m.gender,
        appointedAt: patch.appointedAt !== undefined ? patch.appointedAt : m.appointedAt,
        resignedAt: patch.resignedAt !== undefined ? patch.resignedAt : m.resignedAt,
      });
      void load();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  const removeDirector = async (id: string) => {
    try {
      await denominatorApi.deleteBoardMember(id);
      void load();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  const saveCapital = async (field: keyof ShareCapitalDto, raw: string) => {
    const next: ShareCapitalDto = capital ?? {
      fiscalYear,
      totalOutstandingShares: 0,
      publicHeldShares: null,
      bumiputeraHeldShares: null,
    };
    const value = raw.trim() === '' ? null : Number(raw);
    if (value !== null && Number.isNaN(value)) {
      showToast('That is not a number', 'error');
      return;
    }
    const merged = { ...next, [field]: value } as ShareCapitalDto;
    try {
      const saved = await denominatorApi.setShareCapital(
        fiscalYear,
        merged.totalOutstandingShares ?? 0,
        merged.publicHeldShares,
        merged.bumiputeraHeldShares,
      );
      setCapital(saved);
      showToast('Capital structure saved', 'success');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  const addHolder = async () => {
    const holderName = window.prompt('Shareholder name');
    if (!holderName || !holderName.trim()) return;
    const sharesRaw = window.prompt('Shares held');
    const sharesHeld = Number(sharesRaw);
    if (!sharesRaw || Number.isNaN(sharesHeld)) {
      showToast('Shares held must be a number', 'error');
      return;
    }
    try {
      await denominatorApi.addHolding(fiscalYear, holderName.trim(), sharesHeld);
      void load();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<FigureGroup, FigureCatalogueEntry[]>();
    GROUP_ORDER.forEach((g) => map.set(g, []));
    catalogue.forEach((entry) => map.get(entry.group)?.push(entry));
    return map;
  }, [catalogue]);

  return (
    <div className="space-y-8 w-full pb-16 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-navy-100/40">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-primary-600 mb-1">
            <Calculator className="w-4 h-4 text-primary-600" />
            <span className="px-2 py-0.5 bg-primary-50 rounded-md">Reporting inputs</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Denominators</h1>
          <p className="text-xs text-navy-500 mt-1">
            The figures your ratio indicators divide by. Enter them once per financial year and the
            computed indicators follow.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-xs font-semibold text-navy-600" htmlFor="denominator-year">
            Financial year
          </label>
          <select
            id="denominator-year"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            className="text-sm border border-navy-200 rounded-md px-3 py-1.5 bg-white text-navy-900"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                FY{y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-navy-500">Loading…</p>
      ) : (
        <>
          {GROUP_ORDER.map((group) => {
            const entries = grouped.get(group) ?? [];
            if (entries.length === 0) return null;
            const meta = GROUP_META[group];
            return (
              <Card key={group} className="p-6 space-y-4">
                <div className="flex items-center space-x-2">
                  {meta.icon}
                  <h2 className="text-sm font-bold text-navy-950">{meta.title}</h2>
                </div>
                <p className="text-xs text-navy-500">{meta.blurb}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {entries.map((entry) => (
                    <div key={entry.figureKey} className="flex items-center gap-3">
                      <label
                        className="text-xs text-navy-700 flex-1 min-w-0"
                        htmlFor={`fig-${entry.figureKey}`}
                      >
                        {entry.label}
                      </label>
                      <input
                        id={`fig-${entry.figureKey}`}
                        type="number"
                        inputMode={entry.wholeNumber ? 'numeric' : 'decimal'}
                        step={entry.wholeNumber ? 1 : 'any'}
                        value={drafts[entry.figureKey] ?? ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [entry.figureKey]: e.target.value }))
                        }
                        onBlur={() => void saveFigure(entry.figureKey)}
                        className="w-32 text-sm text-right border border-navy-200 rounded-md px-2 py-1 bg-white text-navy-900 tabular-nums"
                      />
                      <span className="text-[11px] text-navy-400 w-20 shrink-0">{entry.unit}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-bold text-navy-950">Board</h2>
              </div>
              <Button variant="secondary" onClick={() => void addDirector()}>
                <Plus className="w-4 h-4" /> Add director
              </Button>
            </div>
            <p className="text-xs text-navy-500">
              Independence and gender per director. Leave gender blank where it is not stated — that
              is an answer, and the ratio counts only what is recorded.
            </p>
            {board.length === 0 ? (
              <p className="text-xs text-navy-400">No directors recorded for FY{fiscalYear}.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-navy-500 border-b border-navy-100">
                    <th className="py-2 font-semibold">Name</th>
                    <th className="py-2 font-semibold">Role</th>
                    <th className="py-2 font-semibold">Independent</th>
                    <th className="py-2 font-semibold">Gender</th>
                    <th className="py-2 font-semibold">Appointed</th>
                    <th className="py-2 font-semibold">Resigned</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {board.map((m) => (
                    <tr key={m.id} className="border-b border-navy-50">
                      <td className="py-2 text-navy-900">{m.name}</td>
                      <td className="py-2 text-navy-600">{m.roleTitle ?? '—'}</td>
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={m.independent}
                          onChange={(e) => void updateDirector(m, { independent: e.target.checked })}
                          aria-label={`${m.name} is independent`}
                        />
                      </td>
                      <td className="py-2">
                        <select
                          value={m.gender ?? ''}
                          onChange={(e) =>
                            void updateDirector(m, { gender: e.target.value || null })
                          }
                          className="text-xs border border-navy-200 rounded px-1.5 py-1 bg-white"
                          aria-label={`${m.name} gender`}
                        >
                          <option value="">Not stated</option>
                          <option value="FEMALE">Female</option>
                          <option value="MALE">Male</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <input
                          type="date"
                          value={m.appointedAt ?? ''}
                          onChange={(e) =>
                            void updateDirector(m, { appointedAt: e.target.value || null })
                          }
                          className="text-xs border border-navy-200 rounded px-1.5 py-1 bg-white"
                          aria-label={`${m.name} appointed`}
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="date"
                          value={m.resignedAt ?? ''}
                          onChange={(e) =>
                            void updateDirector(m, { resignedAt: e.target.value || null })
                          }
                          className="text-xs border border-navy-200 rounded px-1.5 py-1 bg-white"
                          aria-label={`${m.name} resigned`}
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => void removeDirector(m.id)}
                          className="text-navy-400 hover:text-red-600"
                          aria-label={`Remove ${m.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-bold text-navy-950">Share register</h2>
              </div>
              <Button variant="secondary" onClick={() => void addHolder()}>
                <Plus className="w-4 h-4" /> Add holder
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([
                ['totalOutstandingShares', 'Total outstanding shares'],
                ['publicHeldShares', 'Public-held shares'],
                ['bumiputeraHeldShares', 'Bumiputera-held shares'],
              ] as const).map(([field, label]) => (
                <div key={field} className="flex flex-col gap-1">
                  <label className="text-xs text-navy-700" htmlFor={`cap-${field}`}>
                    {label}
                  </label>
                  <input
                    id={`cap-${field}`}
                    type="number"
                    defaultValue={capital?.[field] ?? ''}
                    onBlur={(e) => void saveCapital(field, e.target.value)}
                    className="text-sm text-right border border-navy-200 rounded-md px-2 py-1 bg-white text-navy-900 tabular-nums"
                  />
                </div>
              ))}
            </div>
            {holdings.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-navy-500 border-b border-navy-100">
                    <th className="py-2 font-semibold">#</th>
                    <th className="py-2 font-semibold">Holder</th>
                    <th className="py-2 font-semibold text-right">Shares held</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <tr key={h.id} className="border-b border-navy-50">
                      <td className="py-2 text-navy-400 tabular-nums">{i + 1}</td>
                      <td className="py-2 text-navy-900">{h.holderName}</td>
                      <td className="py-2 text-right text-navy-900 tabular-nums">
                        {h.sharesHeld.toLocaleString()}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await denominatorApi.deleteHolding(h.id);
                              void load();
                            } catch (e) {
                              showToast(errorMessage(e), 'error');
                            }
                          }}
                          className="text-navy-400 hover:text-red-600"
                          aria-label={`Remove ${h.holderName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default DenominatorsView;
