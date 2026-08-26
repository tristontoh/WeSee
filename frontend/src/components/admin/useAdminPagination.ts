/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

/**
 * Client-side pagination over an already-fetched/filtered array — resets to page 1 whenever the
 * item count changes (e.g. a search/filter narrowed it) or the page size changes.
 *
 * Deliberately keys off `items.length` rather than the array itself: callers typically derive
 * `items` via `.filter()` on every render, which produces a new array reference each time even
 * when its contents are unchanged — depending on the array directly would re-fire this effect
 * (and reset the page) after every render, including the one triggered by paging forward.
 */
export function useAdminPagination<T>(items: T[], defaultPageSize: number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  useEffect(() => {
    setPage(1);
  }, [items.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = items.slice(pageStart, pageStart + pageSize);

  return { page: safePage, setPage, pageSize, setPageSize, totalPages, pageItems };
}
