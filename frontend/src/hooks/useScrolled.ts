/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { useEffect, useState } from 'react';

/**
 * True once the page has scrolled past `threshold`. Backs the marketing nav, which is transparent
 * over a photographic hero and frosts itself once there is content behind it — a solid bar at the
 * very top would cut the hero off.
 *
 * Passive listener, and it reads scrollY rather than observing an element so a page without a hero
 * behaves the same.
 */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}
