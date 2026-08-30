/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

/** Mirrors backend/.../user/Role.java. */
export type Role = 'COMPANY_ADMIN' | 'COMPANY_CONTRIBUTOR' | 'CONSULTANT' | 'PLATFORM_ADMIN' | 'SUPERADMIN';

/** Roles that belong to a tenant company and see tenant data views (dashboard, materiality, etc). */
export const TENANT_ROLES: Role[] = ['COMPANY_ADMIN', 'COMPANY_CONTRIBUTOR', 'CONSULTANT'];

/** Roles allowed to manage the workspace itself: people, subscription, settings. */
export const MANAGEMENT_ROLES: Role[] = ['COMPANY_ADMIN'];

/** Roles allowed into the platform operator console. SUPERADMIN supersedes PLATFORM_ADMIN. */
export const PLATFORM_ROLES: Role[] = ['PLATFORM_ADMIN', 'SUPERADMIN'];

/** `allowed` of `undefined` means "any authenticated role" — the common case for data views. */
export function canAccess(userRole: Role | undefined, allowed?: Role[]): boolean {
  if (!allowed) return true;
  if (!userRole) return false;
  return allowed.includes(userRole);
}

/**
 * Custom per-company RBAC check (module.action keys, e.g. 'team.manage') — the fine-grained
 * complement to canAccess()'s coarse role-group checks. COMPANY_ADMIN always passes (the fixed
 * "owner" role — see backend PermissionGateService); PLATFORM_ROLES are out of scope for this
 * axis entirely and never pass. Everyone else needs the key in their assigned custom role's
 * granted permission set, fetched once at login onto UserProfile.permissions.
 *
 * `permissions` of `undefined` means the backend serves no `permissions` on /auth/me, i.e. it has
 * no RBAC layer and gates on role alone. Denying everything there would hide Team and every other
 * fine-grained screen from contributors and consultants on a backend that never intended to
 * restrict them, so the coarse role becomes the whole answer. An empty set is the opposite case —
 * RBAC exists and granted this user nothing — and still denies.
 */
export function hasPermission(userRole: Role | undefined, permissions: Set<string> | undefined, key: string): boolean {
  if (!userRole) return false;
  if (userRole === 'COMPANY_ADMIN') return true;
  if (canAccess(userRole, PLATFORM_ROLES)) return false;
  if (permissions === undefined) return canAccess(userRole, TENANT_ROLES);
  return permissions.has(key);
}

/**
 * Where to send a user right after login/registration. Platform-level roles have no company
 * and skip onboarding entirely (there's nothing for them to onboard) — they go straight to the
 * operator console.
 */
export function postLoginPath(role: Role | undefined, onboardingCompleted: boolean): string {
  if (canAccess(role, PLATFORM_ROLES)) return '/admin';
  if (!onboardingCompleted) return '/onboarding';
  return '/dashboard';
}
