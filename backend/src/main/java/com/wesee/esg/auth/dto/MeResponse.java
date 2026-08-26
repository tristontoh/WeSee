package com.wesee.esg.auth.dto;

import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.SubscriptionPlan;
import com.wesee.esg.user.Role;

import java.time.LocalDate;
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
        List<String> permissions
) {
}
