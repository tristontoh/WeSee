/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// 1. Sidebar Section Label Component
interface SidebarSectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarSectionLabel({ children, className = '' }: SidebarSectionLabelProps) {
  return (
    <div className={`px-3 mb-2 text-[10px] font-bold tracking-wider text-navy-400 uppercase font-sans ${className}`}>
      {children}
    </div>
  );
}

// 2. Sidebar Navigation Item Component
interface SidebarNavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string | number;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export default function SidebarNavItem({
  icon,
  label,
  active = false,
  badge,
  className = '',
  ...props
}: SidebarNavItemProps) {
  const baseClasses = 'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group font-sans cursor-pointer text-left';
  
  const activeClasses = active
    ? 'bg-navy-100 text-navy-900 font-semibold'
    : 'text-navy-600 hover:text-navy-800 hover:bg-navy-50/50';

  return (
    <button
      className={`${baseClasses} ${activeClasses} ${className}`}
      {...props}
    >
      <div className="flex items-center min-w-0">
        <span className={`mr-3 shrink-0 ${active ? 'text-navy-900' : 'text-navy-400 group-hover:text-navy-600'} transition-colors duration-150`}>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>

      {badge !== undefined && (
        <span className={`ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded-md min-w-[18px] text-center ${
          active 
            ? 'bg-navy-200 text-navy-800' 
            : 'bg-navy-100 text-navy-600 group-hover:bg-navy-200 group-hover:text-navy-800'
        } transition-all duration-150`}>
          {badge}
        </span>
      )}
    </button>
  );
}
