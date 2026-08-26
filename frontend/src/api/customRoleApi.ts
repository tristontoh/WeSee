/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './client';

export interface CustomRoleResponse {
  id: string;
  name: string;
  description: string | null;
  permissionKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomRoleRequest {
  name: string;
  description?: string;
  permissionKeys: string[];
}

export const customRoleApi = {
  list: () => apiClient.get<CustomRoleResponse[]>('/api/v1/company/roles'),

  create: (data: CustomRoleRequest) => apiClient.post<CustomRoleResponse>('/api/v1/company/roles', data),

  update: (roleId: string, data: CustomRoleRequest) =>
    apiClient.put<CustomRoleResponse>(`/api/v1/company/roles/${roleId}`, data),

  delete: (roleId: string) => apiClient.delete<void>(`/api/v1/company/roles/${roleId}`),
};
