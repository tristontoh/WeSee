package com.wesee.esg.tenant.dto;

import com.wesee.esg.tenant.PlanPricing;
import com.wesee.esg.tenant.SubscriptionPlan;

import java.math.BigDecimal;

public record PlanPricingResponse(
        SubscriptionPlan plan,
        BigDecimal monthlyPrice,
        BigDecimal annualMonthlyPrice
) {
    public static PlanPricingResponse from(PlanPricing p) {
        return new PlanPricingResponse(p.getPlan(), p.getMonthlyPrice(), p.getAnnualMonthlyPrice());
    }
}
