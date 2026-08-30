/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import { Status } from '../../types';

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  status?: Status;
  height?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  status,
  height = 'sm',
  showPercentage = false,
  className = '',
  ...props
}: ProgressBarProps) {
  // Normalize value between 0 and 100
  const percentage = Math.min(Math.max(value, 0), 100);

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  // Color mappings based on design system
  const statusColors: Record<Status, string> = {
    done: 'bg-primary-500',
    progress: 'bg-status-progress-dot',
    stuck: 'bg-status-stuck-dot',
    review: 'bg-status-review-dot',
  };

  const barColorClass = status ? statusColors[status] : 'bg-primary-500';
  const trackColorClass = 'bg-navy-100';

  return (
    <div className={`w-full font-sans ${className}`} {...props}>
      <div className="flex justify-between items-center mb-1.5">
        {showPercentage && (
          <span className="text-xs font-mono text-navy-500 ml-auto">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      <div className={`w-full rounded-full overflow-hidden ${trackColorClass} ${heightClasses[height]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
