package com.wesee.esg.tenant.dto;

import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanySizeBand;
import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.SubscriptionPlan;

import java.util.UUID;

import java.time.Instant;

public record CompanyResponse(
        UUID id,
        String name,
        String sectorCode,
        CompanySizeBand sizeBand,
        MarketClassification marketClassification,
        SubscriptionPlan subscriptionPlan,
        boolean sectorModuleEnabled,
        boolean onboardingCompleted,
        Instant trialEndsAt,
        boolean trialConverted
) {
    public static CompanyResponse from(Company c) {
        return new CompanyResponse(
                c.getId(), c.getName(), c.getSector() != null ? c.getSector().getCode() : null,
                c.getSizeBand(), c.getMarketClassification(), c.getSubscriptionPlan(),
                Boolean.TRUE.equals(c.getSectorModuleEnabled()), Boolean.TRUE.equals(c.getOnboardingCompleted()),
                c.getTrialEndsAt(), Boolean.TRUE.equals(c.getTrialConverted())
        );
    }
}
