/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth.dto;

import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.SubscriptionPlan;
import com.wesee.esg.user.Role;

import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MeResponse(
        UUID userId,
        String name,
        String email,
        Role role,
        UUID companyId,
        String companyName,
        String sectorCode,
        MarketClassification market,
        SubscriptionPlan plan,
        boolean onboardingCompleted,
        List<String> frameworks,
        List<String> priorities,
        String phone,
        LocalDate dateOfBirth,
        String address,
        String bio,
        boolean hasAvatar,
        boolean mfaSetupRequired,
        /** Granted keys of the user's custom role; empty for COMPANY_ADMIN and platform roles. */
        List<String> permissions,
        /** When the free trial runs out, and whether the company has since actually paid. */
        Instant trialEndsAt,
        boolean trialConverted,
        /**
         * The workspace is suspended or closed and every other endpoint is refusing it. GET
         * /auth/me is exempt from that refusal precisely so this flag can get out — without it the
         * client renders its usual shell and fills it with failed requests.
         */
        boolean workspaceSuspended
) {
}
