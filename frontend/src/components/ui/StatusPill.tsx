/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import { Status } from '../../types';

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: Status;
  customLabel?: string;
  showDot?: boolean;
  className?: string;
  size?: 'xs' | 'sm';
}

export default function StatusPill({
  status,
  customLabel,
  showDot = true,
  className = '',
  size = 'sm',
  ...props
}: StatusPillProps) {
  // Label fallback map
  const labelMap: Record<Status, string> = {
    done: 'Done',
    progress: 'In Progress',
    stuck: 'Stuck',
    review: 'In Review',
  };

  const label = customLabel || labelMap[status];

  // Specific Tailwind CSS classes corresponding to the Tailwind v4 theme variables
  const statusClasses: Record<Status, { bg: string; text: string; border: string; dot: string }> = {
    done: {
      bg: 'bg-status-done-bg',
      text: 'text-status-done-text font-medium',
      border: 'border-status-done-border/50',
      dot: 'bg-status-done-dot',
    },
    progress: {
      bg: 'bg-status-progress-bg',
      text: 'text-status-progress-text font-medium',
      border: 'border-status-progress-border/50',
      dot: 'bg-status-progress-dot',
    },
    stuck: {
      bg: 'bg-status-stuck-bg',
      text: 'text-status-stuck-text font-medium',
      border: 'border-status-stuck-border/50',
      dot: 'bg-status-stuck-dot',
    },
    review: {
      bg: 'bg-status-review-bg',
      text: 'text-status-review-text font-medium',
      border: 'border-status-review-border/50',
      dot: 'bg-status-review-dot',
    },
  };

  const activeStyle = statusClasses[status];

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses[size]} ${activeStyle.bg} ${activeStyle.text} ${activeStyle.border} ${className}`}
      {...props}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${activeStyle.dot}`} />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}
