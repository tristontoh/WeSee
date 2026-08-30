/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality.dto;

import com.wesee.esg.materiality.AssessmentStatus;
import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.SubscriptionPlan;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record AssessmentDetailResponse(
        UUID id,
        String name,
        LocalDate assessmentDate,
        SubscriptionPlan planAtCapture,
        MarketClassification marketAtCapture,
        String createdByName,
        AssessmentStatus status,
        String validatedByName,
        Instant validatedAt,
        List<String> stakeholders,
        List<ScoreResponse> scores
) {
}
