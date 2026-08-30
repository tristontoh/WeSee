/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { useDismissable } from '../../hooks/useDismissable';

interface ModalProps {
  open: boolean;
  /** Omit to make the dialog non-dismissable — no Escape, no backdrop click, no close button. */
  onClose?: () => void;
  title: string;
  /** Sits under the title, for the sentence explaining what the dialog is doing. */
  subtitle?: string;
  children?: React.ReactNode;
  /** Buttons, laid out right-aligned and wrapping on narrow screens. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * A centred dialog over a frosted backdrop, matching the sidebar drawer's scrim.
 *
 * Deliberately not a `<dialog>`: Safari still renders its backdrop opaque under
 * `backdrop-filter`, which loses the blur the rest of the app is built on.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className = '',
}: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  useDismissable(open, onClose, panel);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0E27]/40 backdrop-blur-sm animate-fade-in"
      // Only the backdrop itself, never a click that started inside the panel and drifted out.
      onClick={(e) => {
        if (onClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col bg-white rounded-[22px] border border-white/60 shadow-2xl outline-none ${className}`}
      >
        <div className="flex items-start gap-3 px-6 pt-6 pb-4 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold tracking-tight text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 -mr-1 -mt-1 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-6 pb-2 overflow-y-auto min-h-0 flex-1">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-4 mt-2 border-t border-gray-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
