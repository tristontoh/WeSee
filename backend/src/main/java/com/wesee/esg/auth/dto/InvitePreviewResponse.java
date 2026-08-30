/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth.dto;

import com.wesee.esg.user.Role;

public record InvitePreviewResponse(
        String companyName,
        String name,
        String email,
        Role role,
        String invitedByName
) {
}
