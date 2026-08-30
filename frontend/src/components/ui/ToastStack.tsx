/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Loader2, X } from 'lucide-react';
import { ToastMessage, ToastType } from '../../contexts/ToastContext';

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  info: <Loader2 className="w-4 h-4 text-primary-400 animate-spin shrink-0" />,
};

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

/**
 * The single floating toast stack for the whole app — see ToastContext.tsx for the useToast() hook.
 *
 * Anchored bottom-right, not top-right: the top-right of every screen in this app is where its own
 * page actions live (Dashboard's Export / Create Report, the topbar's profile menu), and a toast
 * there lands on top of them. The bottom corner is the only one nothing else claims.
 */
export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5 pointer-events-none">
      {/* Not reversed: bottom-anchored, so the newest belongs nearest the corner — last in the DOM. */}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          aria-live={toast.type === 'error' || toast.type === 'warning' ? 'assertive' : 'polite'}
          className="pointer-events-auto flex items-start gap-3 bg-navy-950/95 backdrop-blur-sm text-white pl-3.5 pr-2.5 py-3 rounded-2xl shadow-[0_18px_50px_rgba(5,8,30,.45)] border border-white/10 animate-slide-in max-w-sm"
        >
          <span className="mt-px shrink-0">{ICONS[toast.type]}</span>
          <span className="text-[13px] font-medium leading-snug py-0.5">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-white/45 hover:text-white shrink-0 cursor-pointer rounded-md p-1 -m-0.5 hover:bg-white/10 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
