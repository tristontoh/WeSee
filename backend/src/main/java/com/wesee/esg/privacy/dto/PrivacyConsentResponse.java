/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
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
