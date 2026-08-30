/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing.dto;

import com.wesee.esg.tenant.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;

public record ChangePlanRequest(@NotNull SubscriptionPlan targetPlan) {
}
