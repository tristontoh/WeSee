/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing.dto;

import com.wesee.esg.tenant.SubscriptionPlan;

public record ChangePlanResponse(SubscriptionPlan plan, String message) {
}
