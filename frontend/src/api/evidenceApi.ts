/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';

export interface EvidenceHit {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  /** 1-based page, when the transcription carried one. */
  sourcePage: number | null;
  /**
   * 0–1. A suggestion's strength, not a fact's provenance — a figure's source is recorded on the
   * record itself when it is read. Shown so a weak match reads as weak.
   */
  confidence: number;
}

export const evidenceApi = {
  /** Passages that might support a written claim. Empty when the documents say nothing about it. */
  search: (claim: string) => apiClient.post<EvidenceHit[]>('/api/v1/evidence/search', { claim }),

  /** Indexes documents read before this existed. Spends one embedding call per passage. */
  reindex: () => apiClient.post<{ indexed: number }>('/api/v1/evidence/reindex', {}),
};
