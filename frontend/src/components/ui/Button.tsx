/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ButtonVariant, ButtonSize } from '../../types';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  // Styles for different sizes
  const sizeClasses = {
    sm: 'px-4 py-1.5 text-xs font-medium tracking-wide',
    md: 'px-6 py-2.5 text-sm font-medium tracking-wide',
    lg: 'px-8 py-3.5 text-base font-semibold tracking-wide',
  };

  // Base styles
  const baseClasses = 'inline-flex items-center justify-center rounded-full font-sans transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]';

  // Variant styles
  const variantClasses = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm hover:shadow-md focus:ring-primary-500',
    secondary: 'bg-navy-100 hover:bg-navy-200 text-navy-800 hover:text-navy-900 focus:ring-navy-300',
    ghost: 'bg-transparent hover:bg-navy-50 text-navy-600 hover:text-navy-800 focus:ring-navy-100',
    premium: 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-premium hover:shadow-lg focus:ring-purple-500 hover:brightness-105 border-none',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2 inline-flex items-center justify-center">{icon}</span>
      )}
      <span className="truncate">{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2 inline-flex items-center justify-center">{icon}</span>
      )}
    </button>
  );
}
