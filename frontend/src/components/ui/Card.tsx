/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  organicGradient?: boolean;
  padded?: 'none' | 'sm' | 'md' | 'lg'; // md maps to 24px, lg to 32px
  hoverEffect?: boolean;
  className?: string;
  key?: React.Key;
}

export default function Card({
  children,
  organicGradient = false,
  padded = 'md',
  hoverEffect = false,
  className = '',
  ...props
}: CardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6 md:p-8', // 24px - 32px
    lg: 'p-8 md:p-10', // 32px - 40px
  };

  const baseClasses = 'relative bg-white rounded-[18px] border border-navy-100/50 shadow-subtle overflow-hidden';
  const hoverClasses = hoverEffect ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-md' : '';

  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`} {...props}>
      {organicGradient && (
        <>
          {/* Subtle blurred organic green gradient shapes behind card contents */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-primary-200/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-blue-200/10 blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-primary-300/10 blur-3xl pointer-events-none" />
        </>
      )}
      <div className={`relative z-10 ${paddingClasses[padded]}`}>
        {children}
      </div>
    </div>
  );
}
