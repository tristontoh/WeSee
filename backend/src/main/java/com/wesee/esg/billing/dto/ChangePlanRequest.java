package com.wesee.esg.billing.dto;

import com.wesee.esg.tenant.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;

public record ChangePlanRequest(@NotNull SubscriptionPlan targetPlan) {
}
