/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import com.wesee.esg.common.exceptions.ForbiddenException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class CurrentUserProvider {

    public WeSeePrincipal getPrincipal() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof WeSeePrincipal principal)) {
            throw new ForbiddenException("No authenticated user in context");
        }
        return principal;
    }

    public UUID requireCompanyId() {
        UUID companyId = getPrincipal().companyId();
        if (companyId == null) {
            throw new ForbiddenException("Current user is not associated with a company");
        }
        return companyId;
    }
}
