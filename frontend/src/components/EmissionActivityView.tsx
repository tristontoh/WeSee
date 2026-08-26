/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Card from './ui/Card';
import Select from './ui/Select';
import Button from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import {
  climateApi,
  EmissionActivityEntryResponse,
  EmissionFactorResponse,
  EmissionScopeType,
} from '../api/climateApi';
import { ApiError } from '../api/client';

const SCOPES: { value: EmissionScopeType; label: string }[] = [
  { value: 'SCOPE_1', label: 'Scope 1 — direct' },
  { value: 'SCOPE_2', label: 'Scope 2 — energy' },
  { value: 'SCOPE_3', label: 'Scope 3 — value chain' },
];

/** Derived rather than pinned to a literal, so the selector does not go stale with the calendar. */
const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 2, THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

export default function EmissionActivityView() {
  const { showToast } = useToast();

  const [factors, setFactors] = useState<EmissionFactorResponse[]>([]);
  const [entries, setEntries] = useState<EmissionActivityEntryResponse[]>([]);
  const [year, setYear] = useState(THIS_YEAR);
  const [factorId, setFactorId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [scope, setScope] = useState<EmissionScopeType>('SCOPE_1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    climateApi.listEmissionFactors()
      .then((f) => {
        setFactors(f);
        setFactorId((current) => current || f[0]?.id || '');
      })
      .catch((err: ApiError) => setError(err.message));
  }, []);

  const loadEntries = (fiscalYear: number) => {
    climateApi.listActivityEntries(fiscalYear)
      .then(setEntries)
      .catch((err: ApiError) => setError(err.message));
  };

  useEffect(() => loadEntries(year), [year]);

  const total = entries
    .reduce((sum, e) => sum + Number(e.calculatedTco2e || 0), 0)
    .toFixed(3);

  const add = () => {
    const parsed = Number(quantity);
    if (!factorId || quantity.trim() === '' || Number.isNaN(parsed) || parsed <= 0) {
      setError('Enter a quantity greater than zero.');
      return;
    }
    setBusy(true);
    setError('');
    climateApi.addActivityEntry(year, factorId, parsed)
      .then(() => {
        setQuantity('');
        loadEntries(year);
      })
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setBusy(false));
  };

  const remove = (entry: EmissionActivityEntryResponse) => {
    climateApi.deleteActivityEntry(entry.id)
      .then(() => loadEntries(year))
      .catch((err: ApiError) => setError(err.message));
  };

  const apply = () => {
    setBusy(true);
    setError('');
    const count = entries.length;
    climateApi.applyActivityToScope(year, scope)
      .then(() => showToast(`Applied ${count} entries to ${scope.replace('_', ' ')}.`, 'success'))
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Emission activity</h2>
          <p className="text-sm text-gray-500 mt-1">
            Log activity data and convert it to tCO₂e using published Malaysian factors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Fiscal year</span>
          <Select
            size="sm"
            className="w-[130px]"
            aria-label="Fiscal year"
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
          />
        </div>
      </div>

      {error && (
        <Card padded="sm" className="border-status-stuck-border/60">
          <p className="text-sm text-status-stuck-text">{error}</p>
        </Card>
      )}

      <Card>
        <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-4">ADD ACTIVITY</div>
        <div className="flex gap-2.5 flex-wrap items-center">
          <Select
            aria-label="Emission factor"
            className="flex-[2] min-w-[260px]"
            value={factorId}
            onChange={setFactorId}
            options={factors.map((f) => ({
              value: f.id,
              label: f.name,
              hint: `${f.factorValue} kg/${f.activityUnit}`,
            }))}
          />
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            inputMode="decimal"
            aria-label="Quantity"
            className="flex-1 min-w-[120px] px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
          <Button variant="primary" onClick={add} disabled={busy}>Add entry</Button>
        </div>
      </Card>

      <Card>
        <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-4">
          ENTRIES · {year} ({entries.length})
        </div>

        {!entries.length && <p className="text-sm text-gray-500">No entries for {year}.</p>}

        <div className="divide-y divide-gray-100">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{e.emissionFactorName}</p>
                <p className="text-xs text-gray-500 mt-0.5">Quantity {e.quantity}</p>
              </div>
              <span className="font-mono text-sm font-semibold text-gray-900">{e.calculatedTco2e} tCO₂e</span>
              <button
                onClick={() => remove(e)}
                aria-label={`Delete ${e.emissionFactorName}`}
                className="shrink-0 p-2 text-status-stuck-text border border-status-stuck-border rounded-full hover:bg-status-stuck-bg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {entries.length > 0 && (
          <div className="flex justify-end items-baseline gap-2.5 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-500">TOTAL</span>
            <span className="font-mono text-xl font-bold text-gray-900">{total} tCO₂e</span>
          </div>
        )}
      </Card>

      <Card>
        <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-4">APPLY TO A SCOPE</div>
        <div className="flex gap-2.5 items-center flex-wrap">
          <Select
            aria-label="Scope"
            className="w-[190px]"
            value={scope}
            onChange={(v) => setScope(v as EmissionScopeType)}
            options={SCOPES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Button variant="primary" onClick={apply} disabled={busy || !entries.length}>
            Apply {entries.length} entries
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Applying writes these entries into your scope totals. Viewing the combined scope 1/2/3
          picture needs the Issuer Ready plan, so the total above is computed here from your entries.
        </p>
      </Card>
    </div>
  );
}
