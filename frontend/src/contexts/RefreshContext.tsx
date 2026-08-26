/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Refresher = () => void | Promise<unknown>;

interface RefreshContextValue {
  /** Runs every refresher the mounted screens have registered. */
  refresh: () => Promise<void>;
  /** True while any of them is still running, so the control can show it. */
  refreshing: boolean;
  register: (fn: Refresher) => () => void;
}

const RefreshContext = createContext<RefreshContextValue | null>(null);

/**
 * Lets the top bar's refresh control re-fetch whatever screen is on show.
 *
 * Screens fetch on mount and keep their rows in local state, so anything deleted or changed
 * elsewhere — another tab, another admin, straight in the database — stayed on screen until a full
 * page load. A screen registers how to reload itself; the control calls all of them.
 */
export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const refreshers = useRef(new Set<Refresher>());
  const [refreshing, setRefreshing] = useState(false);

  const register = useCallback((fn: Refresher) => {
    refreshers.current.add(fn);
    return () => {
      refreshers.current.delete(fn);
    };
  }, []);

  const refresh = useCallback(async () => {
    const current = [...refreshers.current];
    if (current.length === 0) {
      // Never a control that silently does nothing: a screen that has not been taught to reload
      // itself still gets reloaded, just bluntly.
      window.location.reload();
      return;
    }
    setRefreshing(true);
    try {
      // allSettled, not all: one failing endpoint must not stop the others from refreshing, and
      // each screen already reports its own errors.
      await Promise.allSettled(current.map((fn) => fn()));
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <RefreshContext.Provider value={{ refresh, refreshing, register }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefreshControl(): RefreshContextValue {
  const ctx = useContext(RefreshContext);
  if (!ctx) {
    throw new Error('useRefreshControl must be used inside a RefreshProvider');
  }
  return ctx;
}

/**
 * Registers one reload function for as long as the calling screen is mounted.
 *
 * Held in a ref and registered once, so a `load` redefined on every render does not re-subscribe
 * on every render — the caller does not have to memoise it.
 */
export function useRefreshable(load: Refresher): void {
  const ctx = useContext(RefreshContext);
  const latest = useRef(load);
  latest.current = load;

  useEffect(() => {
    if (!ctx) return;
    return ctx.register(() => latest.current());
  }, [ctx]);
}
