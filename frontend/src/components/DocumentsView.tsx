/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileText, Search, SlidersHorizontal, Upload, X } from 'lucide-react';
import Card from './ui/Card';
import StatusPill from './ui/StatusPill';
import Select from './ui/Select';
import { Status } from '../types';
import { extractionApi, ExtractedDocumentResponse, ExtractionStatus, isPending } from '../api/extractionApi';
import { ApiError } from '../api/client';
import { useRefreshable } from '../contexts/RefreshContext';

/** The pill colour each extraction status reads as. The label stays the raw status. */
const STATUS_TONE: Record<ExtractionStatus, Status> = {
  PENDING: 'review',
  EXTRACTING: 'progress',
  READY: 'done',
  FAILED: 'stuck',
};

/**
 * Where a document stands, as one value — the row text and the filter must never disagree about it.
 *
 * `to-review` is the state that matters: a figure sits in it until somebody accepts or rejects it,
 * and nothing reaches a report before that. It was not distinguished while the detail screen had no
 * way to accept anything; now that it does, "read" and "dealt with" are different things again.
 */
type ReviewState = 'working' | 'failed' | 'to-review' | 'reviewed' | 'nothing-found';

function reviewStateOf(doc: ExtractedDocumentResponse): ReviewState {
  if (doc.status === 'FAILED') return 'failed';
  if (doc.status !== 'READY') return 'working';
  const records = doc.records ?? [];
  if (!records.length) return 'nothing-found';
  return records.some((r) => r.status === 'PROPOSED') ? 'to-review' : 'reviewed';
}

/** What the filename says the file is. Named by extension, since that is all a name carries. */
type FileKind = 'pdf' | 'image' | 'document';

function fileKindOf(doc: ExtractedDocumentResponse): FileKind {
  const ext = doc.originalFileName.slice(doc.originalFileName.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'image';
  return 'document';
}

const DATE_RANGES: { value: string; label: string; days: number | null }[] = [
  { value: 'any', label: 'Any time', days: null },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: '365', label: 'Last 12 months', days: 365 },
];

/**
 * Every string a search should look at: the name the utility gave the file, and the document's own
 * transcription — so an account number or a Malay line item finds the bill it was printed on. A
 * filename is often a camera's (`IMG_0421.jpg`), which is exactly why it cannot be the only field.
 */
function searchableParts(doc: ExtractedDocumentResponse): string[] {
  const parts: string[] = [doc.originalFileName];
  const t = doc.transcription;
  if (t) {
    for (const f of t.fields ?? []) {
      parts.push(f.label, f.value);
      if (f.labelEnglish) parts.push(f.labelEnglish);
    }
    for (const table of t.tables ?? []) {
      if (table.title) parts.push(table.title);
      if (table.titleEnglish) parts.push(table.titleEnglish);
      parts.push(...(table.columns ?? []));
      for (const row of table.rows ?? []) parts.push(...row);
    }
  }
  return parts.filter(Boolean);
}

/**
 * The transcribed line a query matched, for the row to show. Without it a search says a document
 * matched but not why — and when the match is inside a table nobody can see from the list, that is
 * the whole of what the reader needs.
 */
function matchInTranscription(doc: ExtractedDocumentResponse, needle: string): string | null {
  const t = doc.transcription;
  if (!t || !needle) return null;

  for (const f of t.fields ?? []) {
    if (`${f.label} ${f.value}`.toLowerCase().includes(needle)) return `${f.label}: ${f.value}`;
  }
  for (const table of t.tables ?? []) {
    for (const row of table.rows ?? []) {
      if (row.join(' ').toLowerCase().includes(needle)) {
        return `${table.title ? `${table.title} — ` : ''}${row.filter(Boolean).join(' · ')}`;
      }
    }
  }
  return null;
}

function summarise(doc: ExtractedDocumentResponse): string {
  const state = reviewStateOf(doc);
  const records = doc.records ?? [];

  switch (state) {
    case 'failed':
      return doc.failureReason || 'Could not be read';
    case 'working':
      return 'Being read';
    case 'nothing-found':
      return 'Nothing usable was found';
    case 'to-review': {
      const outstanding = records.filter((r) => r.status === 'PROPOSED').length;
      return `${outstanding} figure${outstanding === 1 ? '' : 's'} to review`;
    }
    case 'reviewed': {
      const accepted = records.filter((r) => r.status === 'ACCEPTED').length;
      // Naming what was kept, not just that the reviewing is over: "all reviewed" reads the same
      // whether every figure was accepted or every one was thrown away.
      return accepted
        ? `${accepted} of ${records.length} accepted`
        : `All ${records.length} rejected`;
    }
  }
}

/**
 * What the document turned out to be about, from the matters its readings landed in — a water bill
 * reads as "Water Management", a TNB bill as "Energy Consumption & GHG Footprint". Derived from the
 * indicator's own matter rather than from the file name, which is whatever the utility called it.
 */
function subjectsOf(doc: ExtractedDocumentResponse): string[] {
  const names = (doc.records ?? [])
    .map((r) => r.matterName)
    .filter((n): n is string => !!n);
  return [...new Set(names)];
}

const UNCLASSIFIED = 'Not yet classified';

const FILTERS: { key: ReviewState | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'to-review', label: 'To review' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'nothing-found', label: 'Nothing found' },
  { key: 'working', label: 'Being read' },
  { key: 'failed', label: 'Failed' },
];

export default function DocumentsView() {
  const [documents, setDocuments] = useState<ExtractedDocumentResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewState | 'all'>('all');
  const [subject, setSubject] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState('any');
  const [fileKind, setFileKind] = useState<FileKind | 'any'>('any');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const needle = query.trim().toLowerCase();
  /** Drives the count on the funnel: the two filters behind it are otherwise invisible when shut. */
  const hiddenFilterCount = (dateRange === 'any' ? 0 : 1) + (fileKind === 'any' ? 0 : 1);

  const clearAll = () => {
    setFilter('all');
    setSubject('all');
    setQuery('');
    setDateRange('any');
    setFileKind('any');
  };

  // Counted over everything, not over the filtered list, so the tabs keep saying how much is in
  // each state while you are standing inside one of them.
  const counts = useMemo(() => {
    const byState = new Map<ReviewState, number>();
    for (const doc of documents) {
      const state = reviewStateOf(doc);
      byState.set(state, (byState.get(state) ?? 0) + 1);
    }
    return byState;
  }, [documents]);

  // Every subject present, with how many documents carry it. A document read as both energy and
  // water counts under each, because it genuinely is both.
  const subjectOptions = useMemo(() => {
    const byName = new Map<string, number>();
    for (const doc of documents) {
      const subjects = subjectsOf(doc);
      for (const name of subjects.length ? subjects : [UNCLASSIFIED]) {
        byName.set(name, (byName.get(name) ?? 0) + 1);
      }
    }
    return [...byName.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [documents]);

  const visible = useMemo(() => {
    const matchesState = (d: ExtractedDocumentResponse) => filter === 'all' || reviewStateOf(d) === filter;
    const matchesSubject = (d: ExtractedDocumentResponse) => {
      if (subject === 'all') return true;
      const subjects = subjectsOf(d);
      return subject === UNCLASSIFIED ? subjects.length === 0 : subjects.includes(subject);
    };
    const matchesQuery = (d: ExtractedDocumentResponse) =>
      !needle || searchableParts(d).some((part) => part.toLowerCase().includes(needle));

    const matchesDate = (d: ExtractedDocumentResponse) => {
      const days = DATE_RANGES.find((r) => r.value === dateRange)?.days;
      if (!days) return true;
      // Uploaded, not extracted: a document that failed to read carries no extraction date but is
      // still something you uploaded on a day you remember.
      return Date.now() - new Date(d.createdAt).getTime() <= days * 86_400_000;
    };

    const matchesKind = (d: ExtractedDocumentResponse) => fileKind === 'any' || fileKindOf(d) === fileKind;

    return documents.filter(
      (d) => matchesState(d) && matchesSubject(d) && matchesQuery(d) && matchesDate(d) && matchesKind(d),
    );
  }, [documents, filter, subject, needle, dateRange, fileKind]);

  // A tab holding nothing is noise; the one you are on stays put so it cannot vanish under you.
  const shownFilters = FILTERS.filter(
    (f) => f.key === 'all' || f.key === filter || (counts.get(f.key as ReviewState) ?? 0) > 0,
  );

  // Read by the poll so it can decide whether to keep going without re-subscribing on every change.
  const documentsRef = useRef(documents);
  documentsRef.current = documents;

  /*
   * First load only, so a refetch never blanks a list the reader is working in — an empty list and
   * an unread one are different facts, and only one of them means "add something".
   */
  const [loading, setLoading] = useState(true);

  const reload = () => extractionApi.list()
    .then(setDocuments)
    .catch((err: ApiError) => setError(err.message))
    .finally(() => setLoading(false));

  // Re-fetched by the top bar's refresh control, not only by the poll below — the poll stops once
  // every document is terminal, so a document removed elsewhere would otherwise linger.
  useRefreshable(reload);

  useEffect(() => {
    const refresh = reload;

    refresh();
    // Extraction runs off the request thread, so the list is polled while any document is still
    // PENDING or EXTRACTING, and left alone once all are terminal.
    const timer = window.setInterval(() => {
      if (documentsRef.current.some(isPending)) refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Documents</h2>
        <p className="text-sm text-gray-500 mt-1">
          Every uploaded bill or invoice, and the figures read out of it.
        </p>
      </div>

      {error && (
        <Card padded="sm" className="border-status-stuck-border/60">
          <p className="text-sm text-status-stuck-text">{error}</p>
        </Card>
      )}

      {/* An empty screen is an invitation, so it points at the one thing to do next rather than
          just reporting that there is nothing. */}
      {loading && !documents.length && !error && (
        <Card padded="lg">
          <p className="text-sm text-gray-400 text-center">Loading documents…</p>
        </Card>
      )}

      {!loading && !documents.length && !error && (
        <Card padded="lg">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No documents yet</h3>
            <p className="text-xs text-gray-500 mt-1.5 mb-5 max-w-sm leading-relaxed">
              Upload a bill or invoice and it will be read for the figures it contains.
            </p>
            <Link
              to="/extraction"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium tracking-wide text-white bg-primary-500 hover:bg-primary-600 rounded-full shadow-sm hover:shadow-md transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload a document
            </Link>
          </div>
        </Card>
      )}

      {documents.length > 0 && (
        <Card padded="none">
          <div className="px-6 pt-5 pb-4 flex flex-wrap items-center gap-x-4 gap-y-3 justify-between">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {visible.length === documents.length
                ? `${documents.length} document${documents.length === 1 ? '' : 's'}`
                : `${visible.length} of ${documents.length} documents`}
            </div>

            {/* Shown from the second document onwards. Gating it on "more than one state exists"
                hid it in the ordinary case — a queue of documents all waiting to be reviewed is
                exactly when you want to narrow the list. */}
            {documents.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Fixed width, on the same row as everything else: the list it narrows is right
                    below it, and a full-width bar would push the controls it belongs with onto
                    another line. */}
                <div className="relative w-[190px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search documents…"
                    aria-label="Search documents by name or content"
                    className="w-full h-8 pl-8 pr-7 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/30 transition-colors"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {subjectOptions.length > 1 && (
                  <Select
                    size="sm"
                    className="w-[210px]"
                    aria-label="Filter by what the document is about"
                    value={subject}
                    onChange={setSubject}
                    options={[
                      { value: 'all', label: 'All subjects', hint: String(documents.length) },
                      ...subjectOptions.map(([name, n]) => ({ value: name, label: name, hint: String(n) })),
                    ]}
                  />
                )}

                {/* Date and file type sit behind this rather than on the row: they are reached
                    rarely, and the badge is what says they are on when the panel is shut. */}
                <div className="relative">
                  <button
                    onClick={() => setFiltersOpen((v) => !v)}
                    aria-expanded={filtersOpen}
                    aria-label="More filters"
                    className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors cursor-pointer ${
                      hiddenFilterCount || filtersOpen
                        ? 'border-primary-500 text-primary-600 bg-primary-50'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 bg-white'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {hiddenFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-primary-500 text-white text-[9px] font-bold leading-[14px]">
                        {hiddenFilterCount}
                      </span>
                    )}
                  </button>

                  {filtersOpen && (
                    <>
                      {/* Click-away, so the panel closes the way the menus elsewhere do. */}
                      <div className="fixed inset-0 z-40" onClick={() => setFiltersOpen(false)} />
                      <div className="absolute right-0 top-9 z-50 w-[220px] bg-white border border-gray-100 rounded-xl shadow-lg p-3 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Uploaded
                          </label>
                          <Select
                            size="sm"
                            className="w-full"
                            aria-label="Filter by upload date"
                            value={dateRange}
                            onChange={setDateRange}
                            options={DATE_RANGES.map((r) => ({ value: r.value, label: r.label }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            File type
                          </label>
                          <Select
                            size="sm"
                            className="w-full"
                            aria-label="Filter by file type"
                            value={fileKind}
                            onChange={(v) => setFileKind(v as FileKind | 'any')}
                            options={[
                              { value: 'any', label: 'Any type' },
                              { value: 'pdf', label: 'PDF' },
                              { value: 'image', label: 'Image' },
                              { value: 'document', label: 'Spreadsheet or doc' },
                            ]}
                          />
                        </div>
                        {hiddenFilterCount > 0 && (
                          <button
                            onClick={() => { setDateRange('any'); setFileKind('any'); }}
                            className="text-[11px] font-bold text-primary-600 hover:text-primary-700 cursor-pointer"
                          >
                            Clear these
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
                {shownFilters.map((f) => {
                  const isActive = filter === f.key;
                  const n = f.key === 'all' ? documents.length : counts.get(f.key as ReviewState) ?? 0;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      aria-pressed={isActive}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {f.label}
                      <span className={`tabular-nums ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{n}</span>
                    </button>
                  );
                })}
              </div>
              </div>
            )}
          </div>

          <div className="divide-y divide-gray-100 border-t border-gray-100">
            {visible.map((doc) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                data-document={doc.originalFileName}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{doc.originalFileName}</p>
                    {/* A filename is whatever the utility called it; this is what the document
                        turned out to be. Only the first is shown inline — the rest are a count,
                        because a row has to stay one line. */}
                    {subjectsOf(doc).slice(0, 1).map((name) => (
                      <span
                        key={name}
                        className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 max-w-[190px] truncate"
                        title={subjectsOf(doc).join(' · ')}
                      >
                        {name}
                      </span>
                    ))}
                    {subjectsOf(doc).length > 1 && (
                      <span className="shrink-0 text-[10px] font-bold text-gray-400">
                        +{subjectsOf(doc).length - 1}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {summarise(doc)} · uploaded by {doc.uploadedBy}
                  </p>
                  {/* Why this row matched, when the reason is text no column shows. */}
                  {needle && matchInTranscription(doc, needle) && (
                    <p className="text-[11px] text-gray-500 mt-1 truncate">
                      <span className="text-gray-400">Matched </span>
                      {matchInTranscription(doc, needle)}
                    </p>
                  )}
                </div>
                <StatusPill status={STATUS_TONE[doc.status]} customLabel={doc.status} size="xs" />
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </Link>
            ))}

            {visible.length === 0 && (
              <p className="px-6 py-10 text-center text-xs text-gray-400">
                Nothing matches these filters.{' '}
                <button
                  onClick={clearAll}
                  className="font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
                >
                  Show all
                </button>
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
