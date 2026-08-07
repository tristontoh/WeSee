package com.wesee.esg.climate.dto;

import com.wesee.esg.climate.Currency;
import com.wesee.esg.climate.RiskOpportunityType;
import com.wesee.esg.climate.TimeHorizon;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpsertS1ItemRequest(
        @NotBlank String title,
        @NotNull RiskOpportunityType type,
        String description,
        @NotNull TimeHorizon horizon,
        BigDecimal financialImpact,
        @NotNull Currency currency
) {
}
