/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.permission;

import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.security.WeSeePrincipal;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import com.wesee.esg.user.Role;
import org.springframework.stereotype.Component;

/**
 * Backs {@code @PreAuthorize("@perm.check('module.action')")} on custom-RBAC-gated endpoints.
 * Mirrors {@link com.wesee.esg.reference.PlanGateService}'s "always re-read from the DB, never
 * trust the JWT" philosophy: a role's permissions can be edited and take effect on the very next
 * request, with no re-login required.
 *
 * COMPANY_ADMIN is the fixed "owner" role — it implicitly passes every check here and can never
 * be permission-gated out of its own company (the lockout-prevention safety net enforced
 * alongside CompanyService's last-admin guard). PLATFORM_ADMIN/SUPERADMIN are entirely out of
 * scope for this axis — their access is governed elsewhere and never derives from a custom role.
 */
@Component("perm")
public class PermissionGateService {

    private final CurrentUserProvider currentUserProvider;
    private final AppUserRepository appUserRepository;

    public PermissionGateService(CurrentUserProvider currentUserProvider, AppUserRepository appUserRepository) {
        this.currentUserProvider = currentUserProvider;
        this.appUserRepository = appUserRepository;
    }

    public boolean check(String permissionKey) {
        WeSeePrincipal principal = currentUserProvider.getPrincipal();

        if (principal.role() == Role.COMPANY_ADMIN) {
            return true;
        }
        if (principal.role() == Role.PLATFORM_ADMIN || principal.role() == Role.SUPERADMIN) {
            return false;
        }

        AppUser user = appUserRepository.findById(principal.userId()).orElse(null);
        if (user == null || user.getCustomRole() == null) {
            return false;
        }
        return user.getCustomRole().getPermissionKeys().contains(permissionKey);
    }
}
