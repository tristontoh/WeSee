package com.wesee.esg.privacy.dto;

import jakarta.validation.constraints.NotNull;

public record UpdatePrivacyConsentRequest(
        @NotNull Boolean marketingConsent,
        @NotNull Boolean analyticsConsent
) {
}
