/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Wrapper classes — override when embedding inside a card that already has its own padding (default assumes a full-bleed table with no surrounding padding). */
  className?: string;
}

export default function AdminPagination({
  page, totalPages, totalItems, pageSize, pageSizeOptions, onPageChange, onPageSizeChange,
  className = 'flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100',
}: AdminPaginationProps) {
  const pageStart = (page - 1) * pageSize;

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500">
          Showing <span className="font-bold text-gray-700">{pageStart + 1}–{Math.min(pageStart + pageSize, totalItems)}</span> of{' '}
          <span className="font-bold text-gray-700">{totalItems}</span>
        </span>
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] text-gray-400 font-bold uppercase">Rows:</span>
          <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-full border border-gray-100">
            {pageSizeOptions.map((size) => (
              <button
                key={size}
                onClick={() => onPageSizeChange(size)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full cursor-pointer transition-all ${
                  pageSize === size
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-bold text-gray-700 px-2">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
