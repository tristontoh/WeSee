/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.assurance;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * The digest that says: these figures, signed by this person, on this date.
 *
 * <p>Pure and separate from {@link AssuranceService} so it can be tested, because this one
 * function carries the product's entire claim — the supply-chain disclosure a buyer relies on
 * quotes it, and an assurer is meant to be able to trust it.
 *
 * <p>Two properties the first version did not have:
 *
 * <p><b>Fields cannot run into each other.</b> The old format joined everything with a bare
 * {@code |}, and a signer's name is free text. A name containing a pipe serialised identically to
 * a different name and title — two different sign-offs, one hash. Every field is now
 * length-prefixed, so no content can imitate a delimiter.
 *
 * <p><b>Scale does not change the digest.</b> The old format hashed {@code toPlainString()}, so
 * 443.5 and 443.50 — the same number — produced different hashes, and re-saving a figure at
 * another scale made an untouched disclosure look tampered with. Values are normalised first.
 */
public final class SignOffHash {

    private SignOffHash() {
    }

    /**
     * @param values indicator id to figure, for the fiscal year being signed
     */
    public static String of(Map<String, BigDecimal> values, UUID companyId, int fiscalYear,
                            String signerName, String signerTitle, Instant signedAt) {
        StringBuilder content = new StringBuilder("wesee-signoff-v2\n");

        // Sorted by id, so the order rows came out of the database cannot change the digest.
        for (Map.Entry<String, BigDecimal> e : new TreeMap<>(values).entrySet()) {
            field(content, e.getKey());
            field(content, normalise(e.getValue()));
        }
        content.append("--\n");
        field(content, companyId == null ? null : companyId.toString());
        field(content, Integer.toString(fiscalYear));
        field(content, signerName);
        field(content, signerTitle);
        field(content, signedAt == null ? null : signedAt.toString());

        return sha256Hex(content.toString());
    }

    /**
     * Length-prefixed, so no value can imitate a separator. A null is distinct from an empty
     * string: "no title given" and "title given as blank" are different facts about a sign-off.
     */
    private static void field(StringBuilder out, String value) {
        if (value == null) {
            out.append("-:\n");
            return;
        }
        out.append(value.length()).append(':').append(value).append('\n');
    }

    /** 443.5 and 443.50 are one number, so they are one string here. */
    private static String normalise(BigDecimal value) {
        if (value == null) {
            return null;
        }
        BigDecimal stripped = value.stripTrailingZeros();
        // stripTrailingZeros turns 0 into 0 but 0.00 into 0E-2; plain string keeps it readable.
        return stripped.compareTo(BigDecimal.ZERO) == 0 ? "0" : stripped.toPlainString();
    }

    private static String sha256Hex(String content) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256")
                    .digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16))
                   .append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by the JVM specification", e);
        }
    }
}
