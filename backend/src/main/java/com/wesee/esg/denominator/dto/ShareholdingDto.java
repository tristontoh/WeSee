/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator.dto;

import com.wesee.esg.denominator.Shareholding;

import java.math.BigDecimal;
import java.util.UUID;

public record ShareholdingDto(
        UUID id,
        Integer fiscalYear,
        String holderName,
        BigDecimal sharesHeld
) {
    public static ShareholdingDto from(Shareholding h) {
        return new ShareholdingDto(h.getId(), h.getFiscalYear(), h.getHolderName(), h.getSharesHeld());
    }
}
