/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator.dto;

import com.wesee.esg.denominator.AnnualFigureKey;
import com.wesee.esg.denominator.CompanyAnnualFigure;

import java.math.BigDecimal;

public record AnnualFigureDto(
        AnnualFigureKey figureKey,
        String label,
        Integer fiscalYear,
        BigDecimal value,
        String unit,
        String sourceNote
) {
    public static AnnualFigureDto from(CompanyAnnualFigure f) {
        return new AnnualFigureDto(
                f.getFigureKey(),
                f.getFigureKey().label(),
                f.getFiscalYear(),
                f.getValue(),
                f.getUnit(),
                f.getSourceNote());
    }
}
