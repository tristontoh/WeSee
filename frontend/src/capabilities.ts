/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

/**
 * Subsystems this frontend can render but the backend it is pointed at does not serve. Each flag
 * stands for a whole family of endpoints that 404s here, so the entry points ask before rendering
 * rather than shipping a control that fails when clicked.
 *
 * The views behind these flags are left in the tree untouched and are still type-checked and
 * built. Turning one back on is flipping the flag once the endpoints exist — nothing has to be
 * rewritten or recovered from history.
 *
 * This is deliberately separate from `permissions.hasPermission`: that answers "is this user
 * allowed", which presumes the feature exists at all. These answer whether it exists.
 */
export const CAPABILITIES = {
  /** `/api/v1/company/ai/*` — ask, draft, settings, usage, prompt templates. */
  ai: true,

  /** `/api/v1/company/roles` and `/api/v1/reference/permissions` — per-company RBAC. */
  customRoles: true,

  /** `/api/v1/activity-log` and `/api/v1/admin/activity-log`. */
  activityLog: true,

  /** `/api/v1/auth/forgot-password` and `/api/v1/auth/reset-password/{token}`. */
  passwordReset: true,
} as const;
