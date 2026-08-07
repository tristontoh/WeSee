package com.wesee.esg.privacy.dto;

import com.wesee.esg.tenant.Company;

import java.time.Instant;

public record PrivacyConsentResponse(
        boolean marketingConsent,
        boolean analyticsConsent,
        Instant consentUpdatedAt
) {
    public static PrivacyConsentResponse from(Company c) {
        return new PrivacyConsentResponse(
                Boolean.TRUE.equals(c.getMarketingConsent()),
                Boolean.TRUE.equals(c.getAnalyticsConsent()),
                c.getConsentUpdatedAt()
        );
    }
}
