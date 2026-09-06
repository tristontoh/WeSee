/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant;

import java.time.Year;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Normalises and checks a Malaysian SSM registration number.
 *
 * <p>Since 11 October 2019 every entity registered with SSM has a twelve-digit number shaped
 * {@code YYYYTTNNNNNN} — year of incorporation, a two-digit entity type, then a six-digit running
 * number. The older form is seven digits and a letter, {@code 1234567-X}. Entities registered after
 * the change carry both, and print them together: {@code 202101012345 (1234567-X)}.
 *
 * <p><b>Only the twelve-digit form is stored.</b> That is not tidiness — it is what makes the
 * uniqueness index mean anything. {@code 1234567-A} and {@code 202101012345} can be the same
 * company, and nothing here can tell; accepting both would let one company hold two workspaces and
 * quietly defeat the constraint it was added for. Practically nobody is excluded: the 2019 change
 * issued a twelve-digit number to every existing entity, so it is on any recent SSM print-out.
 *
 * <p>Two things are deliberately <b>not</b> validated. The entity-type digits, because published
 * sources disagree on them — sole proprietors are cited as both 04 and 07 — and a wrong guess
 * rejects real businesses. And pre-2019 LLP numbers, because no reliable source for that format was
 * to hand, and inventing a pattern would reject entities that exist.
 *
 * <p>What this proves is that a number is well-formed and unclaimed. It cannot prove the number
 * belongs to whoever typed it: SSM numbers are public. See AuthService.register for what happens
 * when two people claim the same one.
 */
public final class SsmRegistrationNumber {

    /** The canonical form, and the only one stored. */
    private static final Pattern TWELVE_DIGIT = Pattern.compile("^(\\d{12})$");

    /** "202101012345 (1234567-X)" — what an SSM print-out actually shows. Take the new number. */
    private static final Pattern COMBINED =
            Pattern.compile("^(\\d{12})\\s*\\(\\s*\\d{6,7}\\s*-?\\s*[A-Z]\\s*\\)$");

    /** The old number on its own. Recognised only so the error can say something useful. */
    private static final Pattern LEGACY_ONLY = Pattern.compile("^\\d{6,7}\\s*-?\\s*[A-Z]$");

    /** SSM was established in 2002, but it absorbed registers going back a long way. */
    private static final int EARLIEST_PLAUSIBLE_YEAR = 1900;

    private SsmRegistrationNumber() {
    }

    /** Raised instead of a generic validation failure so the message can name the actual problem. */
    public static class InvalidSsmNumberException extends IllegalArgumentException {
        public InvalidSsmNumberException(String message) {
            super(message);
        }
    }

    /**
     * @return the twelve-digit canonical number
     * @throws InvalidSsmNumberException with a message written for the person typing, not for a log
     */
    public static String canonicalise(String input) {
        if (input == null || input.isBlank()) {
            throw new InvalidSsmNumberException("Enter your company's SSM registration number.");
        }

        // People paste from PDFs: non-breaking spaces, stray tabs, lowercase suffixes.
        String cleaned = input.trim().replace('\u00A0', ' ').replaceAll("\\s+", " ").toUpperCase();

        Matcher combined = COMBINED.matcher(cleaned);
        if (combined.matches()) {
            return checkYear(combined.group(1));
        }

        Matcher twelve = TWELVE_DIGIT.matcher(cleaned.replace(" ", ""));
        if (twelve.matches()) {
            return checkYear(twelve.group(1));
        }

        if (LEGACY_ONLY.matcher(cleaned).matches()) {
            throw new InvalidSsmNumberException(
                    "That is the old SSM number format. SSM issued every company a new 12-digit "
                            + "number in 2019 — it is on your latest SSM print-out, and looks like "
                            + "202101012345. Please enter that one.");
        }

        throw new InvalidSsmNumberException(
                "That does not look like an SSM registration number. Enter the 12-digit number from "
                        + "your SSM print-out, for example 202101012345.");
    }

    /**
     * The first four digits are the year of incorporation, so they are checkable without knowing
     * anything about SSM's numbering. It catches a transposed or truncated paste, which is the
     * common mistake — not a fabricated number, which no offline check can catch.
     */
    private static String checkYear(String twelveDigits) {
        int year = Integer.parseInt(twelveDigits.substring(0, 4));
        int thisYear = Year.now().getValue();
        if (year < EARLIEST_PLAUSIBLE_YEAR || year > thisYear) {
            throw new InvalidSsmNumberException(
                    "The first four digits of an SSM number are the year the company was "
                            + "incorporated, and " + year + " is not a year a company can have been "
                            + "registered in. Please check the number.");
        }
        return twelveDigits;
    }
}
