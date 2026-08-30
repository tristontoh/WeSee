/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.privacy.dto;

import jakarta.validation.constraints.NotNull;

public record UpdatePrivacyConsentRequest(
        @NotNull Boolean marketingConsent,
        @NotNull Boolean analyticsConsent
) {
}
