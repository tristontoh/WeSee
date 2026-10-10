/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record AllocateRequest(
        /** Bounded to what NUMERIC(18,4) holds, so an overflow is a message rather than a 500. */
        @NotNull @Digits(integer = 14, fraction = 4) BigDecimal purchasedQuantity
) {
}
