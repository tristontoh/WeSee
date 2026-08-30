/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileSearch, Loader, X } from 'lucide-react';
import { useState } from 'react';

import { EvidenceHit, evidenceApi } from '../../api/evidenceApi';

interface FindEvidenceButtonProps {
  /** The written claim to look for support for — usually the textarea's current contents. */
  claim: string;
  /** Opens a document, at a page when the passage carried one. */
  onOpenDocument?: (documentId: string, page: number | null) => void;
}

/**
 * Looks for uploaded documents that might support a narrative claim.
 *
 * Sits opposite Draft with AI on purpose. A model can write a sentence asserting that the board
 * reviews climate risk quarterly, and nothing in the report says whether that is true; this is the
 * other half — the part that goes looking for something behind it.
 *
 * Everything it shows is labelled a suggestion, and the match strength is on every row. A figure's
 * source is recorded when the figure is read and appears as a page citation; this is similarity
 * search over prose, which can miss the right passage and rank a wrong one first. Presenting the
 * two the same way is how a search result ends up quoted in a report as though it were a source.
 */
export default function FindEvidenceButton({ claim, onOpenDocument }: FindEvidenceButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<EvidenceHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    if (!claim.trim()) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    evidenceApi
      .search(claim)
      .then(setHits)
      .catch(() => setError('Could not search the documents just now.'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={run}
        disabled={!claim.trim()}
        title={claim.trim() ? 'Look for documents that support this' : 'Write the claim first'}
        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-navy-200 text-navy-500 hover:text-primary-700 hover:border-primary-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <FileSearch className="w-3 h-3" />
        Find evidence
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-[26rem] max-w-[80vw] bg-white rounded-2xl border border-navy-100 shadow-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-navy-900">Possible supporting documents</p>
              {/* Said plainly, every time: these are candidates a person still has to read. */}
              <p className="text-[10px] text-navy-400 leading-relaxed mt-0.5">
                Suggestions from your uploaded documents — confirm before citing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-navy-300 hover:text-navy-600 cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading && (
            <p className="text-[11px] text-navy-400 flex items-center gap-1.5 py-2">
              <Loader className="w-3 h-3 animate-spin" />
              Searching your documents…
            </p>
          )}

          {error && <p className="text-[11px] text-status-stuck-text">{error}</p>}

          {/* Nothing found is a real answer, and the honest one when the documents are silent. */}
          {!loading && !error && hits?.length === 0 && (
            <p className="text-[11px] text-navy-500 leading-relaxed py-1">
              Nothing in your uploaded documents matches this closely. Upload the minutes, policy or
              certificate it rests on, then search again.
            </p>
          )}

          {!loading &&
            hits?.map((hit) => (
              <button
                key={hit.chunkId}
                type="button"
                onClick={() => onOpenDocument?.(hit.documentId, hit.sourcePage)}
                className="w-full text-left border border-navy-100 rounded-xl p-2.5 hover:border-primary-200 hover:bg-primary-50/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-navy-700 truncate">
                    {hit.documentName}
                    {hit.sourcePage != null && (
                      <span className="font-mono font-normal text-navy-400"> · p.{hit.sourcePage}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-navy-50 text-navy-500">
                    {Math.round(hit.confidence * 100)}% match
                  </span>
                </div>
                <p className="text-[10px] text-navy-500 leading-relaxed line-clamp-3">{hit.content}</p>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
