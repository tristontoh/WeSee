/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Quote, X } from 'lucide-react';
import {
  extractionApi,
  ExtractedDocumentResponse,
  ExtractedRecordResponse,
} from '../api/extractionApi';
import { ApiError } from '../api/client';
import { fiscalYearKeys, fiscalYearNumber } from '../utils/fiscalYears';
import Select from './ui/Select';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** A listbox value cannot be null, so "no month" needs a token of its own. */
const WHOLE_YEAR = 'whole-year';

interface ExtractionReviewStripProps {
  doc: ExtractedDocumentResponse;
  /** Re-fetches the document so accepted rows leave the strip. */
  onReviewed: () => void;
  onError: (message: string) => void;
}

/**
 * The one place a proposed figure becomes real data.
 *
 * Deliberately not a copy of the transcription — that card already shows what the page says, and
 * repeating its figures here was what made the old records card redundant. This holds only what the
 * transcription cannot: where each figure is headed, the period it will be filed under, and the
 * decision. Nothing below the strip writes anything.
 */
export default function ExtractionReviewStrip({ doc, onReviewed, onError }: ExtractionReviewStripProps) {
  const pending = (doc.records ?? []).filter((r) => r.status === 'PROPOSED');

  // Edits are keyed by record id so correcting one row's period leaves the others alone.
  const [edits, setEdits] = useState<Record<string, { fiscalYear: number; month: number | null }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  if (pending.length === 0) return null;

  // Offering the reading's own year matters most here: a 2021 bill has to be filable as 2021, and
  // correctable to the reporting year in the same control.
  const yearKeys = fiscalYearKeys(pending.map((r) => r.fiscalYear));

  const editFor = (r: ExtractedRecordResponse) =>
    edits[r.id] ?? { fiscalYear: r.fiscalYear, month: r.month };

  const setEdit = (id: string, patch: Partial<{ fiscalYear: number; month: number | null }>) =>
    setEdits((e) => ({
      ...e,
      [id]: { ...(e[id] ?? { fiscalYear: 0, month: null }), ...patch } as { fiscalYear: number; month: number | null },
    }));

  const act = (r: ExtractedRecordResponse, accept: boolean) => {
    setBusyId(r.id);
    const edit = editFor(r);
    const run = accept
      ? extractionApi.accept(r.id, { fiscalYear: edit.fiscalYear, month: edit.month ?? undefined })
      : extractionApi.reject(r.id);

    run
      .then(() => onReviewed())
      .catch((err: ApiError) => onError(err.message))
      .finally(() => setBusyId(null));
  };

  return (
    <div className="rounded-[18px] border border-primary-200/70 bg-primary-50/40 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-primary-200/50 bg-white/60">
        <p className="text-sm font-bold text-gray-900">
          {pending.length} figure{pending.length === 1 ? '' : 's'} ready to add to your data
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
          Check each against the document below. Nothing is written until you accept it — and the
          period is what decides which report it appears in.
        </p>
      </div>

      <ul className="divide-y divide-primary-200/40">
        {pending.map((r) => {
          const edit = editFor(r);
          const busy = busyId === r.id;
          const movedYear = edit.fiscalYear !== r.fiscalYear;

          return (
            <li key={r.id} className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[15px] font-bold text-gray-900 tabular-nums">
                    {r.value.toLocaleString()} {r.unit}
                  </span>
                  {/* The unit the page printed, when the platform converted it — the one thing
                      worth double-checking on an otherwise plausible figure. */}
                  {r.unitAsRead && r.unitAsRead !== r.unit && (
                    <span className="text-[11px] text-gray-400">read as {r.unitAsRead}</span>
                  )}
                  <span className="text-gray-300">→</span>
                  <span className="text-[13px] font-semibold text-gray-700">{r.targetName}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {r.targetType === 'EMISSION_ACTIVITY' ? 'emission factor' : 'indicator'}
                  </span>
                </div>

                {r.sourceSnippet && (
                  <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed flex items-start gap-1.5">
                    <Quote className="w-3 h-3 mt-0.5 shrink-0 text-gray-300" />
                    <span className="italic break-words">{r.sourceSnippet}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Select
                  id={`fy-${r.id}`}
                  aria-label="Fiscal year"
                  size="sm"
                  className="w-[104px]"
                  value={`FY${edit.fiscalYear}`}
                  onChange={(v) => setEdit(r.id, { fiscalYear: fiscalYearNumber(v) })}
                  disabled={busy}
                  emphasis={movedYear}
                  options={yearKeys.map((k) => ({
                    value: k,
                    label: k,
                    // Marks the year the document itself is dated, so moving away from it is a
                    // visible choice rather than a slip.
                    hint: fiscalYearNumber(k) === r.fiscalYear ? 'on the bill' : undefined,
                  }))}
                />

                <Select
                  id={`m-${r.id}`}
                  aria-label="Month"
                  size="sm"
                  className="w-[132px]"
                  value={edit.month === null ? WHOLE_YEAR : String(edit.month)}
                  onChange={(v) => setEdit(r.id, { month: v === WHOLE_YEAR ? null : Number(v) })}
                  disabled={busy}
                  options={[
                    // No month files the figure as the whole year, which is right for a document
                    // that covers one — and wrong for a monthly bill, so it stays visible.
                    { value: WHOLE_YEAR, label: 'Whole year' },
                    ...MONTHS.map((name, i) => ({ value: String(i + 1), label: name })),
                  ]}
                />

                <button
                  onClick={() => act(r, true)}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 rounded-full transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {busy ? 'Saving…' : 'Accept'}
                </button>
                <button
                  onClick={() => act(r, false)}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
