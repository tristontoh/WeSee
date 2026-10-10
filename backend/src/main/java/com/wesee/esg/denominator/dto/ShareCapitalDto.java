/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator.dto;

import com.wesee.esg.denominator.ShareCapital;

import java.math.BigDecimal;

public record ShareCapitalDto(
        Integer fiscalYear,
        BigDecimal totalOutstandingShares,
        BigDecimal publicHeldShares,
        BigDecimal bumiputeraHeldShares
) {
    public static ShareCapitalDto from(ShareCapital c) {
        return new ShareCapitalDto(c.getFiscalYear(), c.getTotalOutstandingShares(),
                c.getPublicHeldShares(), c.getBumiputeraHeldShares());
    }
}
