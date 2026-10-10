/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root - visibility is not a licence to use.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Plus, Send, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  supplyChainApi,
  ApiError,
  type Scope3AllocationDto,
  type SharedDisclosureDto,
  type SupplyLinkDto,
} from '../api';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';
import Card from './ui/Card';

/**
 * Both sides of the loop on one screen, because a company is a buyer to its suppliers and a
 * supplier to its buyers, often on the same day.
 */

function message(e: unknown): string {
  if (e instanceof ApiError && e.message) return e.message;
  return e instanceof Error ? e.message : 'Something went wrong';
}

function fmt(n: number | null | undefined, dp = 2): string {
  return n === null || n === undefined ? '-' : n.toLocaleString(undefined, { maximumFractionDigits: dp });
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  DECLINED: 'bg-navy-100 text-navy-600',
  REVOKED: 'bg-navy-100 text-navy-600',
};

const SupplyChainView: React.FC = () => {
  const { showToast } = useToast();
  const thisYear = new Date().getFullYear();

  const [asBuyer, setAsBuyer] = useState<SupplyLinkDto[]>([]);
  const [asSupplier, setAsSupplier] = useState<SupplyLinkDto[]>([]);
  const [available, setAvailable] = useState<SharedDisclosureDto[]>([]);
  const [published, setPublished] = useState<SharedDisclosureDto[]>([]);
  const [allocations, setAllocations] = useState<Scope3AllocationDto[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, s, avail, mine, allocs] = await Promise.all([
        supplyChainApi.listAsBuyer(),
        supplyChainApi.listAsSupplier(),
        supplyChainApi.listAvailable(),
        supplyChainApi.listMinePublished(),
        supplyChainApi.listAllocations(),
      ]);
      setAsBuyer(b);
      setAsSupplier(s);
      setAvailable(avail);
      setPublished(mine);
      setAllocations(allocs);
    } catch (e) {
      showToast(message(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    const email = window.prompt("Supplier's email address");
    if (!email || !email.trim()) return;
    const name = window.prompt('Supplier company name (optional)') ?? undefined;
    try {
      await supplyChainApi.invite(email.trim(), name?.trim() || undefined);
      showToast('Invitation sent', 'success');
      void load();
    } catch (e) {
      showToast(message(e), 'error');
    }
  };

  const publish = async (link: SupplyLinkDto) => {
    const yearRaw = window.prompt('Which financial year do you want to share?', String(thisYear - 1));
    const year = Number(yearRaw);
    if (!yearRaw || Number.isNaN(year)) return;
    try {
      await supplyChainApi.publish(link.id, year);
      showToast(`FY${year} shared with ${link.counterpartyName ?? 'your buyer'}`, 'success');
      void load();
    } catch (e) {
      // The server explains exactly what is missing - an unsigned year, no production output
      // recorded, no activity. Show it rather than a generic failure.
      showToast(message(e), 'error');
    }
  };

  const allocate = async (d: SharedDisclosureDto) => {
    const raw = quantities[d.id];
    const qty = Number(raw);
    if (!raw || Number.isNaN(qty)) {
      showToast('Enter how much you purchased', 'error');
      return;
    }
    try {
      const a = await supplyChainApi.allocate(d.id, qty);
      showToast(`${fmt(a.allocatedTco2e, 4)} tCO2e added to your Scope 3`, 'success');
      void load();
    } catch (e) {
      showToast(message(e), 'error');
    }
  };

  const linkRow = (l: SupplyLinkDto, actions: React.ReactNode) => (
    <tr key={l.id} className="border-b border-navy-50">
      <td className="py-2 text-navy-900">{l.counterpartyName ?? l.counterpartyEmail ?? 'Pending'}</td>
      <td className="py-2">
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_STYLE[l.status] ?? ''}`}>
          {l.status}
        </span>
      </td>
      <td className="py-2 text-navy-500">{new Date(l.invitedAt).toLocaleDateString()}</td>
      <td className="py-2 text-right">{actions}</td>
    </tr>
  );

  return (
    <div className="space-y-8 w-full pb-16 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-navy-100/40">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-primary-600 mb-1">
            <Link2 className="w-4 h-4 text-primary-600" />
            <span className="px-2 py-0.5 bg-primary-50 rounded-md">Scope 3 Category 1</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Supply chain</h1>
          <p className="text-xs text-navy-500 mt-1">
            Source your purchased-goods emissions from your suppliers&rsquo; own signed-off figures,
            instead of estimating them from spend.
          </p>
        </div>
        <Button onClick={() => void invite()}>
          <Plus className="w-4 h-4" /> Invite a supplier
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-navy-500">Loading&hellip;</p>
      ) : (
        <>
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-navy-950">My suppliers</h2>
            {asBuyer.length === 0 ? (
              <p className="text-xs text-navy-400">
                No suppliers invited yet. Each one you link to can share a signed-off year with you.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-navy-500 border-b border-navy-100">
                    <th className="py-2 font-semibold">Supplier</th>
                    <th className="py-2 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Invited</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {asBuyer.map((l) =>
                    linkRow(
                      l,
                      l.status === 'ACTIVE' || l.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await supplyChainApi.revokeLink(l.id);
                              void load();
                            } catch (e) {
                              showToast(message(e), 'error');
                            }
                          }}
                          className="text-navy-400 hover:text-red-600"
                          aria-label="Withdraw this link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null,
                    ),
                  )}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-navy-950">Shared with me</h2>
            {available.length === 0 ? (
              <p className="text-xs text-navy-400">
                Nothing shared yet. A supplier shares a year once it has signed it off.
              </p>
            ) : (
              available.map((d) => {
                const alloc = allocations.find((a) => a.sharedDisclosureId === d.id);
                return (
                  <div key={d.id} className="p-4 rounded-xl border border-navy-100 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-navy-950">
                          {d.counterpartyName ?? 'Supplier'} &middot; FY{d.fiscalYear}
                        </p>
                        <p className="text-xs text-navy-600 font-mono tabular-nums">
                          Scope 1 {fmt(d.scope1Tco2e, 4)} + Scope 2 {fmt(d.scope2Tco2e, 4)} ={' '}
                          {fmt(d.totalTco2e, 4)} tCO2e against {fmt(d.basisQuantity)} {d.basisUnit}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700">
                          <ShieldCheck className="w-3 h-3" /> Signed by {d.signerName}
                        </div>
                        <p className="text-[9px] text-navy-400 font-mono break-all max-w-[220px]">
                          {d.signOffHash.slice(0, 16)}&hellip;
                        </p>
                      </div>
                    </div>

                    {d.supersededByNewer && (
                      <p className="flex items-center gap-1 text-[11px] text-amber-700">
                        <AlertTriangle className="w-3 h-3" />
                        Your supplier has published a newer version of this year. Your allocation
                        still cites the one you drew from &mdash; re-enter a quantity to move to it.
                      </p>
                    )}

                    <details className="text-xs">
                      <summary className="cursor-pointer text-navy-500">
                        How this was calculated ({d.lines.length} line{d.lines.length === 1 ? '' : 's'})
                      </summary>
                      <table className="w-full mt-2">
                        <tbody>
                          {d.lines.map((l) => (
                            <tr key={l.emissionFactorId + l.quantity} className="text-navy-600">
                              <td className="py-1">{l.emissionFactorName}</td>
                              <td className="py-1 text-right font-mono tabular-nums">
                                {fmt(l.quantity, 4)} {l.activityUnit} &times; {l.factorValue}
                              </td>
                              <td className="py-1 text-right font-mono tabular-nums">
                                {fmt(l.tco2e, 4)} tCO2e
                              </td>
                              <td className="py-1 text-right text-[10px] text-navy-400">
                                {l.factorSource} {l.factorSourceYear ?? ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>

                    <div className="flex items-end gap-3">
                      <label className="text-xs text-navy-700" htmlFor={`qty-${d.id}`}>
                        You purchased
                      </label>
                      <input
                        id={`qty-${d.id}`}
                        type="number"
                        value={quantities[d.id] ?? (alloc ? String(alloc.purchasedQuantity) : '')}
                        onChange={(e) => setQuantities((p) => ({ ...p, [d.id]: e.target.value }))}
                        className="w-32 text-sm text-right border border-navy-200 rounded-md px-2 py-1 tabular-nums"
                      />
                      <span className="text-[11px] text-navy-400">{d.basisUnit}</span>
                      <Button variant="secondary" onClick={() => void allocate(d)}>
                        {alloc ? 'Update allocation' : 'Add to my Scope 3'}
                      </Button>
                      {alloc && (
                        <span className="text-xs font-mono text-primary-700 tabular-nums">
                          {fmt(alloc.purchasedQuantity)} &divide; {fmt(d.basisQuantity)} &times;{' '}
                          {fmt(d.totalTco2e, 4)} = {fmt(alloc.allocatedTco2e, 4)} tCO2e
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-navy-950">My buyers</h2>
            <p className="text-xs text-navy-500">
              A year can only be shared once you have signed it off &mdash; that signature is what
              the buyer is relying on.
            </p>
            {asSupplier.length === 0 ? (
              <p className="text-xs text-navy-400">No buyers have linked to you yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-navy-500 border-b border-navy-100">
                    <th className="py-2 font-semibold">Buyer</th>
                    <th className="py-2 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Linked</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {asSupplier.map((l) =>
                    linkRow(
                      l,
                      l.status === 'ACTIVE' ? (
                        <Button variant="secondary" onClick={() => void publish(l)}>
                          <Send className="w-3 h-3" /> Share a year
                        </Button>
                      ) : null,
                    ),
                  )}
                </tbody>
              </table>
            )}
            {published.length > 0 && (
              <table className="w-full text-xs mt-4">
                <thead>
                  <tr className="text-left text-navy-500 border-b border-navy-100">
                    <th className="py-2 font-semibold">Shared with</th>
                    <th className="py-2 font-semibold">Year</th>
                    <th className="py-2 font-semibold text-right">Scope 1 + 2</th>
                    <th className="py-2 font-semibold">State</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {published.map((d) => (
                    <tr key={d.id} className="border-b border-navy-50">
                      <td className="py-2 text-navy-900">{d.counterpartyName ?? '-'}</td>
                      <td className="py-2 text-navy-600">FY{d.fiscalYear}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{fmt(d.totalTco2e, 4)}</td>
                      <td className="py-2 text-[10px] text-navy-500">
                        {d.revokedAt ? d.revocationReason ?? 'Withdrawn' : 'Live'}
                      </td>
                      <td className="py-2 text-right">
                        {!d.revokedAt && (
                          <button
                            type="button"
                            onClick={async () => {
                              const reason = window.prompt('Why are you withdrawing this?') ?? undefined;
                              try {
                                await supplyChainApi.revokeDisclosure(d.id, reason);
                                void load();
                              } catch (e) {
                                showToast(message(e), 'error');
                              }
                            }}
                            className="text-navy-400 hover:text-red-600"
                            aria-label="Withdraw this disclosure"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {allocations.length > 0 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-sm font-bold text-navy-950">In my Scope 3</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-navy-500 border-b border-navy-100">
                    <th className="py-2 font-semibold">Supplier</th>
                    <th className="py-2 font-semibold">Year</th>
                    <th className="py-2 font-semibold">Arithmetic</th>
                    <th className="py-2 font-semibold text-right">tCO2e</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => (
                    <tr key={a.id} className="border-b border-navy-50">
                      <td className="py-2 text-navy-900">
                        {a.supplierName ?? '-'}
                        {a.sourceWithdrawn && (
                          <span className="ml-2 text-[9px] text-amber-700">source withdrawn</span>
                        )}
                        {a.newerSnapshotAvailable && !a.sourceWithdrawn && (
                          <span className="ml-2 text-[9px] text-amber-700">newer version exists</span>
                        )}
                      </td>
                      <td className="py-2 text-navy-600">FY{a.fiscalYear}</td>
                      <td className="py-2 font-mono text-navy-600 tabular-nums">
                        {fmt(a.purchasedQuantity)} &divide; {fmt(a.basisQuantity)} &times;{' '}
                        {fmt(a.supplierTotalTco2e, 4)}
                      </td>
                      <td className="py-2 text-right font-mono font-bold tabular-nums">
                        {fmt(a.allocatedTco2e, 4)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await supplyChainApi.removeAllocation(a.id);
                              showToast('Removed from your Scope 3', 'success');
                              void load();
                            } catch (e) {
                              showToast(message(e), 'error');
                            }
                          }}
                          className="text-navy-400 hover:text-red-600"
                          aria-label="Remove this allocation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default SupplyChainView;
