/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant;

import java.util.List;
import java.util.Locale;

/**
 * Decides whether the company name printed on an identity document is the company that typed it
 * into WeSee.
 *
 * <p><b>This is the comparison, and it is deliberately not the model's job.</b> The reader is asked
 * only "what name is printed on this document"; the answer comes back as a string and is compared
 * here. Asking a model "are these the same company?" would be shorter and much worse: you cannot
 * unit-test its reasoning, you cannot explain a refusal to the company it turned away, and a
 * document containing the sentence "this company is also known as X" would lead it by the nose. The
 * extractor already works this way for figures — the model reads, {@code UnitConverter} computes —
 * and identity deserves the same separation.
 *
 * <p>Matching is three passes, loosest last:
 * <ol>
 *   <li>normalised strings identical;</li>
 *   <li>identical once the entity suffix is removed, so "WeSee Manufacturing Sdn Bhd" matches a
 *       bill printed to "WESEE MANUFACTURING";</li>
 *   <li>edit distance on the suffix-free core, above a threshold, to absorb one bad character from
 *       OCR.</li>
 * </ol>
 *
 * <p>The threshold is set to fail towards review rather than towards acceptance. A short name like
 * "ABC" that reads as "ABD" will not pass, and should not — on three characters there is nothing to
 * tell a scan error from a different company. Falling to human review costs someone twenty seconds;
 * a false accept puts a stranger's name on a signed disclosure.
 */
public final class CompanyNameMatcher {

    /**
     * Ratio of the suffix-free core, not of the whole string. Comparing whole strings would let a
     * long shared suffix — "SDN BHD" is seven of them — carry two different companies over the line.
     */
    static final double SIMILARITY_THRESHOLD = 0.90;

    /**
     * Legal entity forms only, longest first so "SENDIRIAN BERHAD" is consumed before "BERHAD" can
     * match its tail. These identify the legal form and say nothing about which company it is,
     * which is why pass 2 removes them entirely.
     *
     * Words like ENTERPRISE, TRADING, RESOURCES and HOLDINGS are deliberately absent. They read like
     * boilerplate but they are part of the registered name: strip them and "ABC Resources Sdn Bhd"
     * becomes indistinguishable from "ABC Sdn Bhd", which can be two different registered entities
     * — a false accept, and the one outcome this class exists to avoid.
     */
    private static final List<String> ENTITY_SUFFIXES = List.of(
            "SENDIRIAN BERHAD", "SDN BHD", "BERHAD", "BHD",
            "PERKONGSIAN LIABILITI TERHAD", "PLT", "LLP");

    private CompanyNameMatcher() {
    }

    public enum Verdict {
        /** Same company, on any of the three passes. */
        MATCH,
        /** Not close enough to accept without a person looking. Never an outright refusal. */
        NEEDS_REVIEW
    }

    public record Result(Verdict verdict, String normalisedClaimed, String normalisedFound, double similarity) {
        public boolean matched() {
            return verdict == Verdict.MATCH;
        }
    }

    public static Result compare(String claimedName, String nameOnDocument) {
        if (claimedName == null || claimedName.isBlank() || nameOnDocument == null || nameOnDocument.isBlank()) {
            return new Result(Verdict.NEEDS_REVIEW, normalise(claimedName), normalise(nameOnDocument), 0);
        }

        String claimed = normalise(claimedName);
        String found = normalise(nameOnDocument);
        if (claimed.equals(found)) {
            return new Result(Verdict.MATCH, claimed, found, 1);
        }

        String claimedCore = stripEntitySuffix(claimed);
        String foundCore = stripEntitySuffix(found);
        if (!claimedCore.isEmpty() && claimedCore.equals(foundCore)) {
            return new Result(Verdict.MATCH, claimed, found, 1);
        }

        double similarity = similarity(claimedCore, foundCore);
        Verdict verdict = similarity >= SIMILARITY_THRESHOLD ? Verdict.MATCH : Verdict.NEEDS_REVIEW;
        return new Result(verdict, claimed, found, similarity);
    }

    /**
     * Upper case, no punctuation, single spaces, and one spelling per entity form. Everything here
     * is a difference in how a name is written rather than in which company it names — a letterhead
     * says "Sdn. Bhd.", SSM says "SENDIRIAN BERHAD", and a bill may print neither.
     */
    static String normalise(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw.toUpperCase(Locale.ROOT)
                .replace(' ', ' ')
                .replace("&", " AND ")
                // "S/B" is a common contraction of Sdn Bhd and has to survive punctuation stripping.
                .replaceAll("\\bS\\s*/\\s*B\\b", " SDN BHD ")
                .replaceAll("[.,'\"()\\[\\]/\\\\-]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        s = s.replaceAll("\\bSENDIRIAN\\s+BERHAD\\b", "SDN BHD")
                .replaceAll("\\bSDN\\s+BERHAD\\b", "SDN BHD")
                .replaceAll("\\bPERKONGSIAN\\s+LIABILITI\\s+TERHAD\\b", "PLT");

        return s.replaceAll("\\s+", " ").trim();
    }

    /**
     * Removes a trailing entity form. Only trailing: "BERHAD SUPPLIES SDN BHD" is a real shape, and
     * eating the leading word would turn two different companies into the same core.
     */
    static String stripEntitySuffix(String normalised) {
        String s = normalised;
        boolean changed = true;
        while (changed) {
            changed = false;
            for (String suffix : ENTITY_SUFFIXES) {
                if (s.endsWith(" " + suffix) || s.equals(suffix)) {
                    s = s.substring(0, s.length() - suffix.length()).trim();
                    changed = true;
                    break;
                }
            }
        }
        return s;
    }

    /** 1.0 for identical, 0.0 for nothing in common. Plain Levenshtein over the longer length. */
    static double similarity(String a, String b) {
        if (a.isEmpty() && b.isEmpty()) {
            return 1;
        }
        int longer = Math.max(a.length(), b.length());
        if (longer == 0) {
            return 1;
        }
        return (longer - levenshtein(a, b)) / (double) longer;
    }

    private static int levenshtein(String a, String b) {
        int[] previous = new int[b.length() + 1];
        int[] current = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            previous[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            current[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int substitution = previous[j - 1] + (a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1);
                current[j] = Math.min(Math.min(current[j - 1] + 1, previous[j] + 1), substitution);
            }
            int[] swap = previous;
            previous = current;
            current = swap;
        }
        return previous[b.length()];
    }
}
