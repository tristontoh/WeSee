/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { useCallback, useEffect, useState } from 'react';
import { referenceApi } from '../api/referenceApi';
import { categoryFromBackend, FrontendMatterCategory } from '../api/mappers';

export interface SustainabilityMatter {
  id: string;
  name: string;
  category: FrontendMatterCategory;
  description: string;
}

/**
 * Replaces the previously-hardcoded SEDG_MATTERS/BURSA_MAIN_MATTERS/BURSA_ACE_MATTERS arrays —
 * the backend resolves which matter set applies from the company's real plan + market
 * classification (see MatterSetResolverService), so the frontend no longer needs to guess or
 * offer a manual market toggle.
 */
export function useApplicableMatters() {
  const [matters, setMatters] = useState<SustainabilityMatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatters = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    referenceApi
      .applicableMatters()
      .then((data) => {
        if (!cancelled) {
          setMatters(
            data.map((m) => ({
              id: m.id,
              name: m.name,
              category: categoryFromBackend(m.category),
              description: m.description,
            }))
          );
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load matters');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => fetchMatters(), [fetchMatters]);

  return { matters, loading, error, refetch: fetchMatters };
}
