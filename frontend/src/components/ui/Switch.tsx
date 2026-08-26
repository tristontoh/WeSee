/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** Track background when on. Default matches the emerald/gray palette used across Settings & Admin. */
  activeClassName?: string;
  /** Track background when off. */
  inactiveClassName?: string;
}

export default function Switch({
  checked,
  onChange,
  disabled,
  className = '',
  activeClassName = 'bg-emerald-500',
  inactiveClassName = 'bg-gray-200',
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
        checked ? activeClassName : inactiveClassName
      } ${className}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
