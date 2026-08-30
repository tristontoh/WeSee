/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import { AvatarUser } from '../../types';

interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  users: AvatarUser[];
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AvatarStack({
  users,
  max = 3,
  size = 'sm',
  className = '',
  ...props
}: AvatarStackProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  };

  const borderClasses = 'border-2 border-white ring-1 ring-navy-100/50';

  return (
    <div className={`inline-flex items-center -space-x-2.5 font-sans ${className}`} {...props}>
      {visibleUsers.map((user) => {
        // Fallback styling for background
        const fallbackBg = user.bgColor || 'bg-primary-100 text-primary-700';

        return (
          <div
            key={user.id}
            className={`relative rounded-full select-none ${sizeClasses[size]} ${borderClasses} flex items-center justify-center font-medium overflow-hidden shrink-0 group transition-transform duration-200 hover:z-20 hover:scale-105`}
            title={user.name}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className={`w-full h-full flex items-center justify-center ${fallbackBg}`}>
                {user.initials}
              </span>
            )}
          </div>
        );
      })}

      {remainingCount > 0 && (
        <div
          className={`relative rounded-full select-none ${sizeClasses[size]} ${borderClasses} flex items-center justify-center font-semibold bg-navy-100 text-navy-700 z-10 shrink-0`}
          title={`${remainingCount} more user(s)`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
