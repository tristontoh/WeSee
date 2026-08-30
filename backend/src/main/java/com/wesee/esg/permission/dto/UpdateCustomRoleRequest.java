/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.permission.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record UpdateCustomRoleRequest(
        @NotBlank String name,
        String description,
        List<String> permissionKeys
) {
}
