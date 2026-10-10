/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator.dto;

import com.wesee.esg.denominator.AnnualFigureKey;

/**
 * One entry on the data-entry screen: what to ask for, in what unit, under which heading. The
 * frontend renders its form from this rather than hard-coding a list that drifts from the enum.
 */
public record FigureCatalogueEntryDto(
        AnnualFigureKey figureKey,
        String label,
        String unit,
        String group,
        boolean wholeNumber
) {
    public static FigureCatalogueEntryDto from(AnnualFigureKey key, boolean wholeNumber) {
        return new FigureCatalogueEntryDto(
                key, key.label(), key.canonicalUnit(), key.group().name(), wholeNumber);
    }
}
