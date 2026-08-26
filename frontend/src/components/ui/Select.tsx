/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

/** Also the ceiling used when deciding whether the panel has room to open downwards. */
const PANEL_MAX_HEIGHT = 260;

export interface SelectOption {
  value: string;
  label: string;
  /** Secondary text on the right of the row — a unit, a status, "Active". */
  hint?: string;
  /**
   * Heading this row sits under. Consecutive options sharing one are drawn beneath a single
   * header, the way `<optgroup>` did. Headers are not options: they carry no `role`, so keyboard
   * navigation and the type-ahead skip them.
   */
  group?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  /** Shown when `value` matches no option. */
  placeholder?: string;
  /** Draws the closed control in the primary colour — for a value the reader has changed. */
  emphasis?: boolean;
  size?: 'sm' | 'md';
  /**
   * Drops the border and radius so the control can sit as one segment of a joined input — the
   * currency picker welded to an amount field. The surrounding wrapper owns the frame; a second
   * one drawn here reads as a box inside a box.
   */
  seamless?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * A listbox, not a styled `<select>`.
 *
 * A native select's panel is drawn by the operating system and cannot be themed, so on this app's
 * surfaces it reads as a piece of a different program. This matches the menus already in the top
 * bar — same panel, same easing, same tick on the current row — and keeps the keyboard behaviour a
 * native select would have given for free: typing jumps, arrows move, Escape closes, Enter commits.
 */
export default function Select({
  value,
  onChange,
  options,
  disabled,
  placeholder = 'Select…',
  emphasis,
  size = 'md',
  seamless = false,
  id,
  'aria-label': ariaLabel,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActiveState] = useState(0);

  /*
   * The highlight is mirrored in a ref because Enter commits it. Reading the state variable meant
   * committing whatever the current render closed over, so typing a prefix and pressing Enter
   * straight after landed one row short of the match.
   */
  const activeRef = useRef(0);
  const setActive = (next: number | ((i: number) => number)) => {
    const value = typeof next === 'function' ? next(activeRef.current) : next;
    activeRef.current = value;
    setActiveState(value);
  };
  /*
   * The panel is rendered into document.body, not beside the trigger. Card's base styles include
   * overflow-hidden, and so does the review strip this first appeared in — an absolutely positioned
   * panel inside either was simply cut off at the container's edge (144px of the month list was
   * invisible). Fixed positioning against the trigger's viewport box is the only placement that
   * cannot be clipped by an ancestor.
   */
  const [box, setBox] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);

  const wrapper = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });

  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Opening on the current row means arrow keys continue from where the reader is, not from the top.
  const openPanel = () => {
    if (disabled) return;
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = wrapper.current?.contains(target);
      // The panel is no longer a descendant of the wrapper, so it needs its own test.
      const inPanel = list.current?.contains(target);
      if (!inTrigger && !inPanel) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Measured on open and kept in step with scrolling, since a fixed panel does not travel with the
  // page. Capture phase, because the shell scrolls <main> rather than the window.
  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const el = wrapper.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const needed = Math.min(options.length * 36 + 12, PANEL_MAX_HEIGHT);
      const up = r.bottom + needed > window.innerHeight && r.top > needed;
      setBox({ top: up ? r.top - 6 : r.bottom + 6, left: r.left, width: r.width, up });
    };

    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, options.length]);

  // Keeps the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open || !list.current) return;
    list.current.querySelectorAll('[role="option"]')[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        openPanel();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        return;
      case 'Tab':
        // Tab commits and moves on, as a native select does.
        commit(activeRef.current);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(activeRef.current);
        return;
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(i + 1, options.length - 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        return;
      case 'Home':
        e.preventDefault();
        setActive(0);
        return;
      case 'End':
        e.preventDefault();
        setActive(options.length - 1);
        return;
      default:
        break;
    }

    // Type-ahead: consecutive letters build a prefix, a pause starts a new one.
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now();
      typed.current.text = now - typed.current.at > 700 ? e.key : typed.current.text + e.key;
      typed.current.at = now;
      const prefix = typed.current.text.toLowerCase();
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(prefix));
      if (hit >= 0) setActive(hit);
    }
  };

  const trigger = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  return (
    <div ref={wrapper} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onKeyDown}
        className={`w-full inline-flex items-center justify-between gap-2 font-semibold transition-colors outline-none
          focus-visible:ring-2 focus-visible:ring-primary-500/30 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer
          ${trigger}
          ${seamless
            ? 'rounded-none bg-transparent border-0 text-gray-600'
            : emphasis
              ? 'rounded-lg bg-white border-2 border-primary-500 text-primary-700'
              : 'rounded-lg bg-white border border-gray-200 text-gray-700 hover:border-gray-300'}
          ${open && !seamless ? 'border-primary-500' : ''}`}
      >
        <span className={`truncate ${selected ? '' : 'text-gray-400 font-medium'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && box && createPortal(
        <ul
          ref={list}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            top: box.up ? undefined : box.top,
            bottom: box.up ? window.innerHeight - box.top : undefined,
            left: box.left,
            minWidth: box.width,
            maxHeight: PANEL_MAX_HEIGHT,
          }}
          className="z-[60] w-max max-w-[16rem] overflow-y-auto overscroll-contain
            bg-white border border-gray-100 rounded-xl shadow-lg py-1 animate-fade-in"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            const startsGroup = !!option.group && option.group !== options[i - 1]?.group;
            return (
              <React.Fragment key={option.value}>
                {startsGroup && (
                  <li
                    aria-hidden="true"
                    className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400"
                  >
                    {option.group}
                  </li>
                )}
              <li
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
                className={`flex items-center gap-2 px-3 py-2 text-[13px] cursor-pointer transition-colors
                  ${i === active ? 'bg-primary-50' : ''}
                  ${isSelected ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}
              >
                <Check className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary-600' : 'text-transparent'}`} />
                <span className="truncate flex-1">{option.label}</span>
                {option.hint && <span className="text-[11px] text-gray-400 shrink-0">{option.hint}</span>}
              </li>
              </React.Fragment>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
}
