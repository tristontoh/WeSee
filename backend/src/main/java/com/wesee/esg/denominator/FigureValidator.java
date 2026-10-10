/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import java.math.BigDecimal;
import java.time.Year;
import java.util.EnumSet;
import java.util.Set;

/**
 * What a denominator figure is allowed to be. These rules exist because a wrong denominator does
 * not announce itself — it produces a plausible ratio that flows through sign-off into a signed
 * disclosure. The catalogue already contains a recycled-water figure of 103%, which is what a
 * ratio looks like when nothing checks its inputs.
 */
public final class FigureValidator {

    public static final int EARLIEST_FISCAL_YEAR = 2000;

    /** Figures counted in indivisible things. Half a person is a typo, not a measurement. */
    private static final Set<AnnualFigureKey> WHOLE_NUMBER_FIGURES = EnumSet.of(
            AnnualFigureKey.AVERAGE_HEADCOUNT,
            AnnualFigureKey.EMPLOYEE_DEPARTURES,
            AnnualFigureKey.FEMALE_HEADCOUNT,
            AnnualFigureKey.LOST_TIME_INJURIES,
            AnnualFigureKey.EMPLOYEES_TRAINED_ANTICORRUPTION,
            AnnualFigureKey.EMPLOYEES_AWARDED_EQUITY,
            AnnualFigureKey.OPERATIONAL_SITES,
            AnnualFigureKey.SITES_CLIMATE_RISK_ASSESSED,
            AnnualFigureKey.SITES_NEAR_HIGH_CONSERVATION_VALUE,
            AnnualFigureKey.TIER1_SUPPLIERS,
            AnnualFigureKey.TIER1_SUPPLIERS_ASSESSED);

    private FigureValidator() {
    }

    /** A fiscal year may lead the calendar year by one, so FY2027 is enterable during 2026. */
    public static int latestFiscalYear() {
        return Year.now().getValue() + 1;
    }

    public static boolean isWholeNumber(AnnualFigureKey key) {
        return WHOLE_NUMBER_FIGURES.contains(key);
    }

    public static void validate(AnnualFigureKey key, BigDecimal value, int fiscalYear) {
        if (key == null) {
            throw new IllegalArgumentException("A figure must name which figure it is");
        }
        if (value == null) {
            throw new IllegalArgumentException(key.label() + " has no value");
        }
        if (value.signum() < 0) {
            throw new IllegalArgumentException(
                    key.label() + " cannot be negative — a ratio built on it would report a negative percentage");
        }
        if (WHOLE_NUMBER_FIGURES.contains(key) && value.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException(
                    key.label() + " is counted in whole " + key.canonicalUnit().toLowerCase() + ", not fractions");
        }
        requireSaneFiscalYear(fiscalYear);
    }

    /**
     * Shared with the board roster and share register, which carry a fiscal year but no figure
     * value. One definition of "a year somebody could plausibly be reporting".
     */
    public static void requireSaneFiscalYear(int fiscalYear) {
        if (fiscalYear < EARLIEST_FISCAL_YEAR) {
            throw new IllegalArgumentException(
                    "Fiscal year " + fiscalYear + " is before " + EARLIEST_FISCAL_YEAR
                            + " — figures that old have nothing to report against");
        }
        if (fiscalYear > latestFiscalYear()) {
            throw new IllegalArgumentException(
                    "Fiscal year " + fiscalYear + " is beyond " + latestFiscalYear() + " — check the year");
        }
    }
}
