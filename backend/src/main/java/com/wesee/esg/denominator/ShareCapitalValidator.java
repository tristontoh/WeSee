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
    /**
     * One holder cannot own more shares than exist. A null total means no capital structure has
     * been recorded yet, and there is nothing to bound against — refusing there would force the
     * two screens to be filled in one order only.
     */
    public static void requireHoldingWithinCapital(String holderName, BigDecimal sharesHeld,
                                                   BigDecimal totalOutstanding) {
        if (sharesHeld == null || sharesHeld.signum() < 0) {
            throw new IllegalArgumentException("A holding cannot be negative");
        }
        if (totalOutstanding == null) {
            return;
        }
        if (sharesHeld.compareTo(totalOutstanding) > 0) {
            throw new IllegalArgumentException(holderName + " is recorded with "
                    + sharesHeld.toPlainString() + " shares, more than the "
                    + totalOutstanding.toPlainString() + " outstanding");
        }
    }

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
