package com.wesee.esg.reference.dto;

import com.wesee.esg.tenant.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;

public record UpdateFeatureFlagRequest(
        @NotNull SubscriptionPlan minPlan,
        @NotNull Boolean visibleOnlyAtMinPlan
) {
}
