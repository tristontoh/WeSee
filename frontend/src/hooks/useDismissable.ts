/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { useEffect, type RefObject } from 'react';

/**
 * The behaviour every dialog owes its reader: Escape closes it, the page behind stops scrolling,
 * and the keyboard moves inside so Tab cycles the dialog's own controls.
 *
 * Lifted out of `ui/Modal` because a dialog that needs its own chrome had to reimplement it — and
 * the PDF preview, which does, reimplemented only the close button. Escape did nothing there, so
 * the one gesture people reach for first left the report sitting over the page.
 *
 * Pass no `onClose` to make a dialog non-dismissable; the scroll lock and focus still apply.
 */
export function useDismissable(
  open: boolean,
  onClose?: () => void,
  panel?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panel?.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, panel]);
}
