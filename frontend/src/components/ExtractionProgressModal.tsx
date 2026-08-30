/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

/**
 * The upload's own two client-side outcomes, then the four the backend reports. Kept as one union
 * so the stepper has a single thing to switch on.
 */
export type ProcessStage =
  | 'UPLOADING'
  | 'UPLOAD_FAILED'
  | 'PENDING'
  | 'EXTRACTING'
  | 'READY'
  | 'FAILED';

interface ExtractionProgressModalProps {
  open: boolean;
  fileName: string;
  stage: ProcessStage;
  /** Known once the upload is accepted, which is what makes the document linkable. */
  documentId: string | null;
  /** The backend's reason on FAILED, or the upload error on UPLOAD_FAILED. */
  failureReason: string | null;
  /** How many figures were proposed. Only meaningful at READY. */
  recordCount: number;
  onClose: () => void;
  onRetry: () => void;
}

type StepState = 'done' | 'active' | 'failed' | 'waiting';

const STEPS = [
  { key: 'upload', label: 'Uploading the document', activeLabel: 'Uploading the document…' },
  { key: 'queue', label: 'Queued to be read', activeLabel: 'Waiting for a reader…' },
  { key: 'read', label: 'Reading the figures', activeLabel: 'Reading the figures…' },
  { key: 'ready', label: 'Ready to review', activeLabel: 'Ready to review' },
] as const;

/**
 * Which of the four steps each stage lights up.
 *
 * There is deliberately no percentage anywhere: the backend reports discrete states and no
 * progress within them, so a bar filling up would be inventing information. A step that is
 * genuinely of unknown duration says so by spinning.
 */
function stepStates(stage: ProcessStage): StepState[] {
  switch (stage) {
    case 'UPLOADING':      return ['active', 'waiting', 'waiting', 'waiting'];
    case 'UPLOAD_FAILED':  return ['failed', 'waiting', 'waiting', 'waiting'];
    case 'PENDING':        return ['done', 'active', 'waiting', 'waiting'];
    case 'EXTRACTING':     return ['done', 'done', 'active', 'waiting'];
    case 'READY':          return ['done', 'done', 'done', 'done'];
    case 'FAILED':         return ['done', 'done', 'failed', 'waiting'];
  }
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <div className="w-6 h-6 rounded-full bg-status-done-bg flex items-center justify-center shrink-0">
        <Check className="w-3.5 h-3.5 text-status-done-text" />
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
        <Loader2 className="w-3.5 h-3.5 text-primary-600 animate-spin" />
      </div>
    );
  }
  if (state === 'failed') {
    return (
      <div className="w-6 h-6 rounded-full bg-status-stuck-bg flex items-center justify-center shrink-0">
        <AlertCircle className="w-3.5 h-3.5 text-status-stuck-text" />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
      <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
    </div>
  );
}

export default function ExtractionProgressModal({
  open,
  fileName,
  stage,
  documentId,
  failureReason,
  recordCount,
  onClose,
  onRetry,
}: ExtractionProgressModalProps) {
  const states = stepStates(stage);
  const running = stage === 'UPLOADING' || stage === 'PENDING' || stage === 'EXTRACTING';
  const failed = stage === 'FAILED' || stage === 'UPLOAD_FAILED';

  const subtitle = running
    ? 'This keeps going if you close the dialog — the result lands in Documents either way.'
    : failed
      ? 'Nothing was written to your data.'
      : recordCount > 0
        ? `${recordCount} figure${recordCount === 1 ? '' : 's'} proposed. Nothing is written to your data until you accept them.`
        : 'No figures matched an indicator you report. What the document says is still on its page.';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={stage === 'READY' ? 'Document read' : failed ? 'Could not read the document' : 'Processing document'}
      subtitle={subtitle}
      footer={
        <>
          {/* An upload that never landed has no document to retry against, so it restarts instead. */}
          {failed && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {stage === 'UPLOAD_FAILED' ? 'Try again' : 'Retry reading'}
            </Button>
          )}
          {documentId && !running && (
            <Link
              to={`/documents/${documentId}`}
              className="px-4 py-1.5 text-xs font-medium tracking-wide text-white bg-primary-500 hover:bg-primary-600 rounded-full transition-colors"
            >
              View document
            </Link>
          )}
          {running && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close and keep reading
            </Button>
          )}
          {!running && !documentId && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </>
      }
    >
      <p className="text-sm font-semibold text-gray-900 truncate mb-4">{fileName}</p>

      <ol className="space-y-0">
        {STEPS.map((step, i) => {
          const state = states[i];
          const isLast = i === STEPS.length - 1;
          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <StepIcon state={state} />
                {/* The rail is coloured only down to the last completed step, so how far along the
                    run is stays readable at a glance without any number. */}
                {!isLast && (
                  <div
                    className={`w-px flex-1 min-h-[18px] my-1 ${
                      states[i + 1] === 'waiting' ? 'bg-gray-200' : 'bg-primary-200'
                    }`}
                  />
                )}
              </div>

              <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-3'}`}>
                <p
                  className={`text-[13px] leading-6 ${
                    state === 'waiting'
                      ? 'text-gray-400'
                      : state === 'failed'
                        ? 'text-status-stuck-text font-semibold'
                        : state === 'active'
                          ? 'text-gray-900 font-semibold'
                          : 'text-gray-700 font-medium'
                  }`}
                >
                  {state === 'active' ? step.activeLabel : step.label}
                </p>

                {state === 'failed' && failureReason && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed break-words">{failureReason}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}
