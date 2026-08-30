/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth.dto;

import com.wesee.esg.tenant.MarketClassification;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record OnboardingRequest(
        @NotNull MarketClassification market,
        String sectorCode,
        List<String> frameworks,
        List<String> priorities
) {
}
