package com.wesee.esg.tenant.dto;

import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.SubscriptionPlan;

import java.util.UUID;

public record CompanyGroupMemberResponse(
        UUID id,
        String name,
        String sectorCode,
        MarketClassification marketClassification,
        SubscriptionPlan subscriptionPlan,
        boolean current
) {
    public static CompanyGroupMemberResponse from(Company c, boolean current) {
        return new CompanyGroupMemberResponse(
                c.getId(), c.getName(), c.getSector() != null ? c.getSector().getCode() : null,
                c.getMarketClassification(), c.getSubscriptionPlan(), current
        );
    }
}
