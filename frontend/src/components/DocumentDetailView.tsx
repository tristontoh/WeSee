/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronUp, Maximize2 } from 'lucide-react';
import Card from './ui/Card';
import StatusPill from './ui/StatusPill';
import { Status } from '../types';
import { useToast } from '../contexts/ToastContext';
import {
  cellGloss,
  extractionApi,
  ExtractedDocumentResponse,
  ExtractionStatus,
  isPending,
} from '../api/extractionApi';
import { ApiError } from '../api/client';
import { PreviewKind, previewKindFor } from '../utils/filePreview';
import ExtractionReviewStrip from './ExtractionReviewStrip';

/** The pill colour each extraction status reads as. The label stays the raw status. */
const STATUS_TONE: Record<ExtractionStatus, Status> = {
  PENDING: 'review',
  EXTRACTING: 'progress',
  READY: 'done',
  FAILED: 'stuck',
};

/** Older documents were read before transcription existed, so the field can be absent. */
function transcriptionIsEmpty(doc: ExtractedDocumentResponse): boolean {
  const t = doc.transcription;
  return !t || (!t.fields?.length && !t.tables?.length);
}

/**
 * True when every cell in a column is a figure, allowing the thousands separators and currency
 * prefixes a bill prints. Such a column is right-aligned in a tabular font so the digits line up
 * down the column — the whole point of transcribing a meter table is comparing its rows.
 */
function isNumericColumn(rows: string[][], index: number): boolean {
  const cells = rows.map((r) => r[index]).filter((c) => c != null && c.trim() !== '');
  if (!cells.length) return false;
  return cells.every((c) => /^[A-Z]{0,3}\s?-?[\d,]+(\.\d+)?$/.test(c.trim()));
}

export default function DocumentDetailView() {
  const { id = '' } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [doc, setDoc] = useState<ExtractedDocumentResponse | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewKind>('none');
  const [error, setError] = useState<string | null>(null);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  const load = () => extractionApi.get(id)
    .then((d) => {
      setDoc(d);
      setPreview(previewKindFor(d.originalFileName));
    })
    .catch((err: ApiError) => setError(err.message));

  // Read by the poll so it can stop once the document is terminal, without re-subscribing.
  const docRef = useRef(doc);
  docRef.current = doc;

  useEffect(() => {
    load();

    // A document opened straight after upload may still be EXTRACTING, so the records fill in
    // without a manual refresh. Stops once the document reaches a terminal status.
    const timer = window.setInterval(() => {
      const current = docRef.current;
      if (current && isPending(current)) load();
    }, 2000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let objectUrl: string | null = null;

    extractionApi.file(id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      // Left silent on purpose: the document's own record still renders, and a preview that cannot
      // load should not replace the figures with an error.
      .catch(() => setPreview('none'));

    // Revoked, or every visit to this screen leaks the whole file.
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  const retry = () => {
    extractionApi.retry(id)
      .then(load)
      .catch((err: ApiError) => showToast(err.message, 'warning'));
  };

  return (
    // Far wider than the app's usual reading measure: this screen exists to hold a document beside
    // its transcription, and every extra pixel goes somewhere useful — the page is drawn larger,
    // the tables stretch, and the field grid gains a column instead of scrolling. The cap is only
    // here so an ultrawide monitor does not stretch a bill summary across a metre of glass.
    <div className="space-y-4 max-w-[2000px]">
      <Link
        to="/documents"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Documents
      </Link>

      {error && (
        <Card padded="sm" className="border-status-stuck-border/60">
          <p className="text-sm text-status-stuck-text">{error}</p>
        </Card>
      )}

      {doc && (
        <>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 min-w-0 truncate">
              {doc.originalFileName}
            </h2>
            <StatusPill status={STATUS_TONE[doc.status]} customLabel={doc.status} size="xs" />
            {doc.status === 'FAILED' && (
              <button
                onClick={retry}
                className="ml-auto shrink-0 px-3.5 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Read it again
              </button>
            )}
          </div>

          {doc.failureReason && (
            <Card padded="sm" className="border-status-stuck-border/60">
              <p className="text-xs text-status-stuck-text leading-relaxed">{doc.failureReason}</p>
            </Card>
          )}

          {isPending(doc) && (
            <Card padded="sm">
              <p className="text-sm text-gray-500">Being read. What it says appears here when it finishes.</p>
            </Card>
          )}

          {/* The only route from a proposal into the company's data. Its own strip above the two
              columns rather than inside the transcription — that card shows what the page says,
              and mixing the actions into it was what made it redundant. */}
          <ExtractionReviewStrip
            doc={doc}
            onReviewed={load}
            onError={(message) => showToast(message, 'warning')}
          />

          {/*
            Source beside what it says — checking one against the other is the point of the screen,
            so they share a row. The transcription takes the wider column: it is the content, and
            the document is what you check it against.

            Collapsing the source hands its column to the transcription. A meter table is wide, and
            once you have satisfied yourself the figures match the bill you want the reading, not
            the scan.
          */}
          <div
            className={`grid gap-4 items-start grid-cols-1 ${
              previewCollapsed ? '' : 'lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.45fr)]'
            }`}
          >
            {/*
              Pinned beside the transcription rather than sized to it. The transcription of a bill
              runs several screens; a source column that merely sat at the top would scroll away
              exactly when there was something to check it against — and its own fixed height left
              a tall gap next to the longer column.

              `top-0`, not an offset clearing the header: the scroll container is the shell's
              `<main>`, which already begins below the header, and a sticky offset is measured from
              that scrollport rather than from the window.

              A PDF gets a definite height — an `<iframe>` given only a maximum collapses to
              nothing. An image gets a maximum instead, so a bill shorter than the screen ends
              where it ends rather than sitting above a panel of empty grey.
            */}
            <div
              className={`relative bg-gray-50 rounded-[18px] border border-navy-100/50 shadow-subtle overflow-hidden flex flex-col ${
                previewCollapsed
                  ? ''
                  : `lg:sticky lg:top-0 ${
                      preview === 'pdf' ? 'lg:h-[calc(100vh-9rem)]' : 'lg:max-h-[calc(100vh-9rem)]'
                    }`
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 shrink-0">
                <span className="text-[11px] font-semibold text-gray-500 truncate flex-1">
                  {doc.originalFileName}
                </span>

                {/* The browser's own viewer, at whatever size the reader wants — the column can only
                    ever be so wide, and a meter reading printed small has to be legible somewhere. */}
                {!previewCollapsed && src && preview !== 'none' && (
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Full size
                  </a>
                )}

                <button
                  onClick={() => setPreviewCollapsed((c) => !c)}
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-expanded={!previewCollapsed}
                >
                  {previewCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  {previewCollapsed ? 'Show document' : 'Hide document'}
                </button>
              </div>

              {!previewCollapsed && (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {preview === 'image' && src && (
                    <img src={src} alt={doc.originalFileName} className="block w-full h-auto" />
                  )}

                  {/* FitH, so the page is drawn as wide as the column allows. Left to its own
                      default the viewer picks a zoom from the page's paper size, which on a wide
                      screen renders an A4 bill smaller than the space it has. The toolbar is left
                      alone — it is how a reader zooms in further. */}
                  {preview === 'pdf' && src && (
                    <iframe
                      src={`${src}#view=FitH`}
                      title={doc.originalFileName}
                      className="block w-full h-[70vh] lg:h-full border-0 bg-white"
                    />
                  )}

                  {preview === 'none' && (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm font-bold text-gray-900 mb-1.5">No preview for this file type</p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Spreadsheets and documents are stored, but only PDFs and images can be read or shown.
                      </p>
                    </div>
                  )}

                  {preview !== 'none' && !src && (
                    <p className="px-6 py-12 text-center text-sm text-gray-400">Loading the document…</p>
                  )}
                </div>
              )}
            </div>

            {/* Everything here is a copy of the page, nothing more: a transcription, never a
                proposal, so nothing on this screen writes to the company's data. */}
            {!transcriptionIsEmpty(doc) && (
              <Card>
              <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-2">
                WHAT THE DOCUMENT SAYS
              </div>
              <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
                Transcribed as printed, including the figures nothing reports on. Nothing here is
                written to your data.
              </p>

              {/* Label above value, not beside it: a value that wraps (a billing period, an address)
                  made the side-by-side rows different heights and their rules stopped at ragged
                  widths. Stacked, every cell is the same shape whatever it holds. */}
              {doc.transcription.fields.length > 0 && (
                <dl className="grid gap-x-8 gap-y-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))] pb-5 border-b border-gray-100">
                  {doc.transcription.fields.map((f, i) => (
                    <div key={`${f.label}-${i}`}>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{f.label}</dt>
                      {/* The gloss sits under the label it explains, never in place of it: the
                          original is what the page prints, and that is what this card is for. */}
                      {f.labelEnglish && f.labelEnglish !== f.label && (
                        <dt className="text-[11px] text-gray-400/90 italic mt-0.5">{f.labelEnglish}</dt>
                      )}
                      <dd className="text-[15px] text-gray-900 font-medium mt-1 break-words">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* An untitled table gets a rule above it: bills leave headings off, and without one
                  the table reads as a continuation of the one before it. */}
              {doc.transcription.tables.map((tbl, i) => {
                const numeric = tbl.columns.map((_, ci) => isNumericColumn(tbl.rows, ci));
                return (
                  <div
                    key={`${tbl.title ?? 'table'}-${i}`}
                    className={`mt-5 ${!tbl.title && i > 0 ? 'border-t border-gray-100 pt-5' : ''}`}
                  >
                    {tbl.title && (
                      <p className="text-sm font-semibold text-gray-900 mb-3">
                        {tbl.title}
                        {tbl.titleEnglish && tbl.titleEnglish !== tbl.title && (
                          <span className="font-normal text-gray-400 italic ml-2">{tbl.titleEnglish}</span>
                        )}
                      </p>
                    )}
                    {/* Scrolls inside itself so a wide table never pushes the page sideways.
                        `w-full` with a content floor: the table fills the card, and only starts
                        scrolling once its own columns need more room than that. A bill prints its
                        amounts right-aligned against the edge of the page, so a two-column summary
                        spanning the full width reads the way the paper does. */}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max border-collapse text-[13px]">
                        <thead>
                          <tr>
                            {tbl.columns.map((c, ci) => (
                              <th
                                key={`${c}-${ci}`}
                                className={`px-4 first:pl-0 py-2.5 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap ${
                                  numeric[ci] ? 'text-right' : 'text-left'
                                }`}
                              >
                                {c}
                                {/* columnsEnglish is positional and may be shorter than columns. */}
                                {tbl.columnsEnglish?.[ci] && tbl.columnsEnglish[ci] !== c && (
                                  <span className="block font-normal normal-case tracking-normal text-gray-400/90 italic">
                                    {tbl.columnsEnglish[ci]}
                                  </span>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tbl.rows.map((row, ri) => (
                            <tr key={ri} className="hover:bg-gray-50/60 transition-colors">
                              {row.map((cell, ci) => {
                                const gloss = cellGloss(tbl, ri, ci);
                                return (
                                  <td
                                    key={ci}
                                    className={`px-4 first:pl-0 py-2.5 border-b border-gray-100 text-gray-700 whitespace-nowrap ${
                                      numeric[ci] ? 'text-right font-mono tabular-nums text-gray-900' : 'text-left'
                                    }`}
                                  >
                                    {cell}
                                    {/* Under the line item, never instead of it — the same rule the
                                        labels follow. A figure has no gloss and stays one line. */}
                                    {gloss && gloss !== cell && (
                                      <span className="block text-[11px] text-gray-400/90 italic">{gloss}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
