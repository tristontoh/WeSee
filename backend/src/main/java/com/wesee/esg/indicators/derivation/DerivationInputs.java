/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.denominator.AnnualFigureKey;
import com.wesee.esg.denominator.BoardMember;
import com.wesee.esg.extraction.UnitConverter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Everything one derivation may read, for one company and one fiscal year. Assembled once by the
 * service and handed to a pure function, so every derivation is unit-testable without a database.
 */
public record DerivationInputs(
        Map<String, BigDecimal> indicatorValues,
        Map<String, String> indicatorUnits,
        Map<AnnualFigureKey, BigDecimal> figures,
        List<BoardMember> board,
        /** The date point-in-time figures are read at: the last day of the fiscal year. */
        java.time.LocalDate asOf
) {

    /**
     * An indicator's value, converted to the unit the formula expects. A tenant may have entered
     * electricity in kWh where the formula wants MWh; returning the raw number would be wrong by a
     * factor of a thousand and look entirely reasonable on a chart.
     *
     * <p>A unit pair {@link UnitConverter} does not know is returned unconverted rather than
     * throwing: the catalogue's own units are the common case, and a formula that cannot convert
     * should report a missing input, not break the whole indicator screen.
     */
    public BigDecimal indicator(String indicatorId, String expectedUnit) {
        BigDecimal raw = indicatorValues.get(indicatorId);
        if (raw == null) {
            return null;
        }
        String actualUnit = indicatorUnits.get(indicatorId);
        if (actualUnit == null || actualUnit.equalsIgnoreCase(expectedUnit)) {
            return raw;
        }
        try {
            return UnitConverter.convert(raw, actualUnit, expectedUnit);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public BigDecimal figure(AnnualFigureKey key) {
        return figures.get(key);
    }
}
