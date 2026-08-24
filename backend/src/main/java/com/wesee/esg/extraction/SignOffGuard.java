package com.wesee.esg.extraction;

import java.util.Set;

/**
 * The assurance module computes a tamper-evident SHA-256 over a fiscal year's indicator values.
 * Committing an extracted record into a year that has already been signed off would silently
 * break that check, so it is refused.
 */
public final class SignOffGuard {

    private SignOffGuard() {
    }

    public static boolean isYearLocked(Integer fiscalYear, Set<Integer> signedYears) {
        return fiscalYear != null && signedYears.contains(fiscalYear);
    }
}
