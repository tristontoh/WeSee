/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.assurance;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The sign-off hash is the product's whole claim: it says these figures, signed by this person, on
 * this date, have not changed since. Everything else — the supply-chain disclosure a buyer relies
 * on, the assurance trail — rests on it, and until now nothing tested it.
 */
class SignOffHashTest {

    private static final UUID COMPANY = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final Instant SIGNED = Instant.parse("2026-01-15T00:00:00Z");

    private static Map<String, BigDecimal> values(Object... pairs) {
        Map<String, BigDecimal> m = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            m.put((String) pairs[i], new BigDecimal(pairs[i + 1].toString()));
        }
        return m;
    }

    @Test
    void theSameInputsGiveTheSameHash() {
        Map<String, BigDecimal> v = values("IND-ENG-02", "443.56");
        assertEquals(SignOffHash.of(v, COMPANY, 2025, "Jane Lim", "Director", SIGNED),
                     SignOffHash.of(v, COMPANY, 2025, "Jane Lim", "Director", SIGNED));
    }

    @Test
    void itIsSixtyFourHexCharacters() {
        String h = SignOffHash.of(values("IND-ENG-02", "443.56"), COMPANY, 2025, "Jane", "Director", SIGNED);
        assertEquals(64, h.length());
        assertTrue(h.matches("[0-9a-f]{64}"), h);
    }

    @Test
    void changingAFigureChangesTheHash() {
        assertNotEquals(
                SignOffHash.of(values("IND-ENG-02", "443.56"), COMPANY, 2025, "Jane", "Director", SIGNED),
                SignOffHash.of(values("IND-ENG-02", "443.57"), COMPANY, 2025, "Jane", "Director", SIGNED));
    }

    @Test
    void addingAFigureChangesTheHash() {
        assertNotEquals(
                SignOffHash.of(values("IND-ENG-02", "443.56"), COMPANY, 2025, "Jane", "Director", SIGNED),
                SignOffHash.of(values("IND-ENG-02", "443.56", "IND-ENG-03", "533.78"),
                               COMPANY, 2025, "Jane", "Director", SIGNED));
    }

    @Test
    void theOrderFiguresArriveInDoesNotMatter() {
        assertEquals(
                SignOffHash.of(values("IND-ENG-02", "443.56", "IND-ENG-03", "533.78"),
                               COMPANY, 2025, "Jane", "Director", SIGNED),
                SignOffHash.of(values("IND-ENG-03", "533.78", "IND-ENG-02", "443.56"),
                               COMPANY, 2025, "Jane", "Director", SIGNED));
    }

    /**
     * 443.5 and 443.50 are the same number. The old format hashed toPlainString(), so re-saving a
     * figure at a different scale changed the hash and made an untouched disclosure look tampered
     * with.
     */
    @Test
    void theSameNumberAtADifferentScaleGivesTheSameHash() {
        assertEquals(
                SignOffHash.of(values("IND-ENG-02", "443.5"), COMPANY, 2025, "Jane", "Director", SIGNED),
                SignOffHash.of(values("IND-ENG-02", "443.50"), COMPANY, 2025, "Jane", "Director", SIGNED));
    }

    /**
     * The defect this class exists to fix. The old format joined fields with a bare '|', and the
     * signer's name and title are free text — so a name containing a pipe could be rearranged
     * into a different name and title that hashed identically.
     */
    @Test
    void aPipeInTheSignersNameCannotForgeADifferentSignOff() {
        assertNotEquals(
                SignOffHash.of(values("IND-ENG-02", "443.56"), COMPANY, 2025, "Jane|Director", "Group CFO", SIGNED),
                SignOffHash.of(values("IND-ENG-02", "443.56"), COMPANY, 2025, "Jane", "Director|Group CFO", SIGNED));
    }

    /**
     * One indicator called "A|B" holding 1 must not hash the same as two indicators "A" and "B"
     * each holding 1 — which is what a bare-delimiter format would do.
     */
    @Test
    void aSeparatorInsideAnIndicatorIdCannotImitateTwoIndicators() {
        assertNotEquals(
                SignOffHash.of(values("A|B", "1"), COMPANY, 2025, "Jane", "Director", SIGNED),
                SignOffHash.of(values("A", "1", "B", "1"), COMPANY, 2025, "Jane", "Director", SIGNED));
    }

    @Test
    void aColonInsideAnIndicatorIdDoesNotCollideEither() {
        assertNotEquals(
                SignOffHash.of(values("A:1", "2"), COMPANY, 2025, "Jane", "Director", SIGNED),
                SignOffHash.of(values("A", "12"), COMPANY, 2025, "Jane", "Director", SIGNED));
    }

    @Test
    void theSignerTheYearAndTheDateAllChangeIt() {
        Map<String, BigDecimal> v = values("IND-ENG-02", "443.56");
        String base = SignOffHash.of(v, COMPANY, 2025, "Jane", "Director", SIGNED);
        assertNotEquals(base, SignOffHash.of(v, COMPANY, 2025, "John", "Director", SIGNED));
        assertNotEquals(base, SignOffHash.of(v, COMPANY, 2025, "Jane", "CFO", SIGNED));
        assertNotEquals(base, SignOffHash.of(v, COMPANY, 2024, "Jane", "Director", SIGNED));
        assertNotEquals(base, SignOffHash.of(v, UUID.randomUUID(), 2025, "Jane", "Director", SIGNED));
        assertNotEquals(base, SignOffHash.of(v, COMPANY, 2025, "Jane", "Director", SIGNED.plusSeconds(1)));
    }

    @Test
    void anEmptyFigureSetStillHashes() {
        String h = SignOffHash.of(Map.of(), COMPANY, 2025, "Jane", "Director", SIGNED);
        assertEquals(64, h.length());
    }

    @Test
    void aNullSignerTitleDoesNotCollideWithAnEmptyOne() {
        Map<String, BigDecimal> v = values("IND-ENG-02", "443.56");
        assertNotEquals(SignOffHash.of(v, COMPANY, 2025, "Jane", null, SIGNED),
                        SignOffHash.of(v, COMPANY, 2025, "Jane", "", SIGNED));
    }
}
