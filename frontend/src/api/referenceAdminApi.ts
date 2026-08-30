/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { apiClient } from './client';
import { MatterResponse, MatterCategory, MatterSet } from './referenceApi';

export interface MatterUpsertRequest {
  id: string;
  name: string;
  category: MatterCategory;
  description: string;
  matterSet: MatterSet;
}

export const referenceAdminApi = {
  upsertMatter: (request: MatterUpsertRequest) =>
    apiClient.post<MatterResponse>('/api/v1/admin/reference/matters', request),

  deleteMatter: (id: string) => apiClient.delete<void>(`/api/v1/admin/reference/matters/${id}`),
};
