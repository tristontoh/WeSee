package com.wesee.esg.tenant.dto;

import com.wesee.esg.tenant.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;

public record UpdatePlanRequest(@NotNull SubscriptionPlan plan) {
}
