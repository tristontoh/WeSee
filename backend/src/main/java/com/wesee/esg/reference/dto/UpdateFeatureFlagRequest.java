/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference.dto;

import com.wesee.esg.tenant.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;

public record UpdateFeatureFlagRequest(
        @NotNull SubscriptionPlan minPlan,
        @NotNull Boolean visibleOnlyAtMinPlan
) {
}
