/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.governance.dto;

import com.wesee.esg.governance.OversightLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateMatterOwnershipRequest(
        @NotBlank String ownerName,
        @NotNull OversightLevel oversightLevel,
        String notes
) {
}
