/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference.dto;

import com.wesee.esg.reference.FeatureFlag;
import com.wesee.esg.tenant.SubscriptionPlan;

public record FeatureFlagResponse(
        String featureKey,
        SubscriptionPlan minPlan,
        boolean visibleOnlyAtMinPlan
) {
    public static FeatureFlagResponse from(FeatureFlag f) {
        return new FeatureFlagResponse(f.getFeatureKey(), f.getMinPlan(), Boolean.TRUE.equals(f.getVisibleOnlyAtMinPlan()));
    }
}
