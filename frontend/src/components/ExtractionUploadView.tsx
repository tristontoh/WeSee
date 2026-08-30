/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, FileText, FileUp, X } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import ExtractionProgressModal, { ProcessStage } from './ExtractionProgressModal';
import { extractionApi, ExtractedDocumentResponse } from '../api/extractionApi';
import { ApiError } from '../api/client';
import { MAX_UPLOAD_BYTES, PreviewKind, formatBytes, previewKindFor } from '../utils/filePreview';

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.xlsx,.csv,.docx';

const POLL_INTERVAL_MS = 1500;

/**
 * Choosing a file stages it rather than sending it: a bill is read by a paid model, so the reader
 * gets to see which page they picked and press Process. The run itself is followed in a modal,
 * because it takes long enough that a spinner on a button would leave the reader guessing.
 */
export default function ExtractionUploadView() {
  const picker = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // The chosen file, held locally until Process. `stagedUrl` previews it without a round trip.
  const [staged, setStaged] = useState<File | null>(null);
  const [stagedUrl, setStagedUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<PreviewKind>('none');

  const [stage, setStage] = useState<ProcessStage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [processedName, setProcessedName] = useState<string>('');

  // Revoked whenever the staged file changes or the screen unmounts, or each pick leaks a copy of
  // the whole file.
  useEffect(() => {
    if (!staged) {
      setStagedUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(staged);
    setStagedUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [staged]);

  const stageFile = (file: File) => {
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      // Refused here rather than letting the request come back a 413 after the whole upload.
      setError(`${file.name} is ${formatBytes(file.size)}. The limit is 10 MB.`);
      setStaged(null);
      return;
    }
    setStaged(file);
    setPreviewKind(previewKindFor(file.name));
  };

  const clearStaged = () => {
    setStaged(null);
    setError(null);
    // Cleared so re-picking the same file still fires a change event.
    if (picker.current) picker.current.value = '';
  };

  /** Reflects a fetched document onto the modal. The backend's status is the stage, unmapped. */
  const applyDoc = (doc: ExtractedDocumentResponse) => {
    setStage(doc.status);
    setFailureReason(doc.failureReason);
    setRecordCount(doc.records?.length ?? 0);
  };

  const process = (file: File) => {
    setProcessedName(file.name);
    setDocumentId(null);
    setFailureReason(null);
    setRecordCount(0);
    setStage('UPLOADING');
    setModalOpen(true);

    extractionApi.upload(file)
      .then((doc) => {
        setDocumentId(doc.id);
        applyDoc(doc);
        clearStaged();
      })
      .catch((err: ApiError) => {
        setStage('UPLOAD_FAILED');
        setFailureReason(err.message);
      });
  };

  // Follows the run to a terminal status. Keyed on `stage` so it re-arms across each transition and
  // stops itself at READY or FAILED — and keeps polling even with the modal closed, which is what
  // lets the confirmation card below settle on the real outcome.
  useEffect(() => {
    if (!documentId) return;
    if (stage !== 'PENDING' && stage !== 'EXTRACTING') return;

    const timer = window.setInterval(() => {
      extractionApi.get(documentId)
        .then(applyDoc)
        // Left silent: a dropped poll is retried by the next tick, and an error banner that
        // flickers on a slow network would be worse than waiting.
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [documentId, stage]);

  const retry = () => {
    if (stage === 'UPLOAD_FAILED') {
      // Nothing landed, so there is no document to retry — resend the file still held in state.
      if (staged) process(staged);
      return;
    }
    if (!documentId) return;
    setStage('PENDING');
    setFailureReason(null);
    extractionApi.retry(documentId)
      .then(applyDoc)
      .catch((err: ApiError) => {
        setStage('FAILED');
        setFailureReason(err.message);
      });
  };

  const running = stage === 'UPLOADING' || stage === 'PENDING' || stage === 'EXTRACTING';

  return (
    <div className="space-y-4 w-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Document Extraction</h2>
        <p className="text-sm text-gray-500 mt-1">
          Hand over a bill and it is read for the figures it contains.
        </p>
      </div>

      <Card>
        {/* Literal caps, not a `uppercase` class: this label is a test anchor and CSS casing does
            not reach the DOM text a query matches on. */}
        <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-4">
          UPLOAD A SOURCE DOCUMENT
        </div>

        {/* The native file input is visually hidden: its "Choose File" chip is drawn by the browser
            and cannot be styled to match the rest of the app. The button below drives it. */}
        <input
          ref={picker}
          type="file"
          accept={ACCEPTED}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) stageFile(file);
          }}
          className="absolute w-px h-px opacity-0 pointer-events-none"
        />

        {!staged ? (
          <div
            onDragOver={(e) => {
              // Without preventDefault the browser navigates to the dropped file instead of handing it over.
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer?.files?.[0];
              if (file) stageFile(file);
            }}
            className={`rounded-2xl border-[1.5px] border-dashed px-6 py-8 text-center transition-colors ${
              dragging ? 'border-primary-500 bg-primary-50/50' : 'border-gray-200 bg-gray-50/40'
            }`}
          >
            <FileUp className="w-7 h-7 text-gray-400 mx-auto mb-3" />

            <p className="text-sm font-bold text-gray-900">Drop a bill here</p>
            <p className="text-xs text-gray-500 mt-1 mb-5">PDF, image, or spreadsheet · up to 10 MB</p>

            <Button variant="primary" onClick={() => picker.current?.click()}>
              Choose a document
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-gray-50/40 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{staged.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{formatBytes(staged.size)}</p>
              </div>
              <button
                onClick={clearStaged}
                aria-label="Remove the chosen document"
                className="shrink-0 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fitted to the column's width and scrolled vertically, not letterboxed into the box's
                height: every bill is portrait, and fitting one by height shrinks the print past
                reading while leaving the sides empty. */}
            <div className="bg-gray-100/70 h-[min(52vh,460px)] overflow-y-auto overscroll-contain">
              {previewKind === 'image' && stagedUrl && (
                <img src={stagedUrl} alt={staged.name} className="block w-full h-auto" />
              )}
              {previewKind === 'pdf' && stagedUrl && (
                // The PDF viewer scrolls itself, so this one fills the box rather than overflowing it.
                <iframe
                  src={`${stagedUrl}#view=FitH`}
                  title={staged.name}
                  className="block w-full h-full border-0 bg-white"
                />
              )}
              {previewKind === 'none' && (
                <p className="text-xs text-gray-500 px-6 py-10 text-center leading-relaxed">
                  A spreadsheet or document file cannot be shown here, and cannot be read for
                  figures — it is kept as evidence only.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 bg-white border-t border-gray-100">
              <Button variant="ghost" size="sm" onClick={clearStaged}>
                Choose another
              </Button>
              <Button variant="primary" size="sm" onClick={() => process(staged)} loading={running}>
                Process
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          The figures found in the document are proposed in Documents. Nothing is written to your
          data until you accept them.
        </p>

        {error && <p className="text-xs text-status-stuck-text mt-3">{error}</p>}
      </Card>

      {/* Without this a document processed with the modal dismissed appears to vanish: it is read
          on another thread and the result lands on a different screen. */}
      {documentId && !modalOpen && (
        <Card padded="sm" className="border-status-done-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-status-done-bg flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-status-done-text" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {processedName} {running ? 'is being read' : stage === 'FAILED' ? 'could not be read' : 'has been read'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {running
                  ? 'The figures appear in Documents when it finishes.'
                  : stage === 'FAILED'
                    ? failureReason ?? 'Open the document to retry.'
                    : `${recordCount} figure${recordCount === 1 ? '' : 's'} proposed for review.`}
              </p>
            </div>
            <Link
              to={`/documents/${documentId}`}
              className="shrink-0 px-4 py-2 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-full transition-colors"
            >
              View document
            </Link>
          </div>
        </Card>
      )}

      {stage && (
        <ExtractionProgressModal
          open={modalOpen}
          fileName={processedName}
          stage={stage}
          documentId={documentId}
          failureReason={failureReason}
          recordCount={recordCount}
          onClose={() => setModalOpen(false)}
          onRetry={retry}
        />
      )}
    </div>
  );
}
