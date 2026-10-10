/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import java.math.BigDecimal;

/**
 * The capital structure's internal arithmetic. Mirrors the CHECK constraints in V86 so a bad
 * figure is refused with a sentence rather than a constraint-violation stack trace.
 */
public final class ShareCapitalValidator {

    private ShareCapitalValidator() {
    }

    public static void validate(BigDecimal totalOutstanding, BigDecimal publicHeld, BigDecimal bumiputeraHeld) {
        if (totalOutstanding == null || totalOutstanding.signum() <= 0) {
            throw new IllegalArgumentException("Total outstanding shares must be greater than zero");
        }
        requireWithin("Public-held shares", publicHeld, totalOutstanding);
        requireWithin("Bumiputera-held shares", bumiputeraHeld, totalOutstanding);
    }

    /**
     * Each holding is bounded by the total, but they are not bounded against each other: a
     * bumiputera public shareholder counts in both, so the two summing above the total is
     * ordinary rather than an error.
     */
    private static void requireWithin(String label, BigDecimal held, BigDecimal total) {
        if (held == null) {
            return;
        }
        if (held.signum() < 0) {
            throw new IllegalArgumentException(label + " cannot be negative");
        }
        if (held.compareTo(total) > 0) {
            throw new IllegalArgumentException(
                    label + " (" + held.toPlainString() + ") exceed the "
                            + total.toPlainString() + " shares outstanding");
        }
    }
}
