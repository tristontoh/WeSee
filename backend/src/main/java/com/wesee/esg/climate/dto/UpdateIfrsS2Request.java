/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate.dto;

import com.wesee.esg.climate.Currency;
import com.wesee.esg.climate.IntegrationLevel;
import com.wesee.esg.climate.ReviewFrequency;

import java.math.BigDecimal;

public record UpdateIfrsS2Request(
        String oversightDescription,
        ReviewFrequency reviewFrequency,
        String responsibleCommittee,
        String physicalRisks,
        String transitionPlan,
        String climateResilience,
        String identificationProcess,
        IntegrationLevel integrationLevel,
        String trackedMetrics,
        String reductionTargets,
        String carbonPricing,
        BigDecimal transitionRiskAssetPct,
        BigDecimal physicalRiskAssetPct,
        BigDecimal climateOpportunityAssetPct,
        BigDecimal climateCapex,
        Currency climateCapexCurrency,
        Boolean executiveRemunerationLinked,
        String executiveRemunerationDescription,
        BigDecimal carbonPriceValue,
        Currency carbonPriceCurrency,
        String linkedTargetId
) {
}
