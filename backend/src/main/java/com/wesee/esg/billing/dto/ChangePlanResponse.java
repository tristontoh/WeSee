package com.wesee.esg.billing.dto;

import com.wesee.esg.tenant.SubscriptionPlan;

public record ChangePlanResponse(SubscriptionPlan plan, String message) {
}
