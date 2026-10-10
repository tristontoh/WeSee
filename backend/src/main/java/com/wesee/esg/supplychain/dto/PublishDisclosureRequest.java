/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * The basis is what the buyer divides its own purchase by. It defaults to the company's recorded
 * PRODUCTION_OUTPUT for that year, so the number entered once on the denominators screen serves
 * both the intensity metrics and this.
 */
public record PublishDisclosureRequest(
        @NotNull Integer fiscalYear,
        BigDecimal basisQuantity,
        @Size(max = 30) String basisUnit
) {
}
