/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record AllocateRequest(@NotNull BigDecimal purchasedQuantity) {
}
