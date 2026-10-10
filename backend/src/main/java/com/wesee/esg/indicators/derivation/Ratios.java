/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * The arithmetic every derivation shares. One place, because inconsistency here is how a ratio
 * becomes 103% — which is what {@code IND-WAT-02} held before these rules existed.
 */
public final class Ratios {

    public static final int PERCENTAGE_SCALE = 2;
    public static final int RATE_SCALE = 4;

    /** The OSHA/Bursa convention: incidents per 200,000 hours, roughly 100 full-time years. */
    private static final BigDecimal LTI_BASE_HOURS = new BigDecimal("200000");

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private Ratios() {
    }

    /**
     * A percentage, bounded at 0 and 100. Outside that range means an input is wrong, so this
     * refuses and names the two numbers rather than clamping — a clamped 100 would hide the bad
     * data behind a plausible figure, which is exactly how a 103% gets signed off.
     */
    public static BigDecimal percentage(BigDecimal numerator, BigDecimal denominator) {
        if (numerator == null || denominator == null || denominator.signum() == 0) {
            return null;
        }
        BigDecimal result = numerator.multiply(ONE_HUNDRED)
                .divide(denominator, PERCENTAGE_SCALE, RoundingMode.HALF_UP);
        if (result.signum() < 0 || result.compareTo(ONE_HUNDRED) > 0) {
            throw new IllegalArgumentException(
                    numerator.toPlainString() + " of " + denominator.toPlainString()
                            + " is " + result.toPlainString() + "% — a percentage here cannot be"
                            + " below 0 or above 100, so one of those two numbers is wrong");
        }
        return result;
    }

    /** An unbounded ratio: intensity, hours per head. Nothing caps these, so nothing checks one. */
    public static BigDecimal rate(BigDecimal numerator, BigDecimal denominator) {
        if (numerator == null || denominator == null || denominator.signum() == 0) {
            return null;
        }
        return numerator.divide(denominator, RATE_SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal perHundredThousandHours(BigDecimal injuries, BigDecimal hoursWorked) {
        if (injuries == null || hoursWorked == null || hoursWorked.signum() == 0) {
            return null;
        }
        return injuries.multiply(LTI_BASE_HOURS)
                .divide(hoursWorked, RATE_SCALE, RoundingMode.HALF_UP);
    }
}
