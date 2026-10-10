/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class AnnualFigureKeyTest {

    @Test
    void everyKeyDeclaresACanonicalUnit() {
        for (AnnualFigureKey key : AnnualFigureKey.values()) {
            assertNotNull(key.canonicalUnit(), key + " has no canonical unit");
            assertFalse(key.canonicalUnit().isBlank(), key + " has a blank canonical unit");
        }
    }

    @Test
    void everyKeyDeclaresALabel() {
        for (AnnualFigureKey key : AnnualFigureKey.values()) {
            assertNotNull(key.label(), key + " has no label");
            assertFalse(key.label().isBlank(), key + " has a blank label");
        }
    }

    @Test
    void theCatalogueIsTheEighteenFiguresTheSpecNames() {
        assertEquals(18, AnnualFigureKey.values().length);
    }

    @Test
    void revenueIsDenominatedInRinggitMillions() {
        assertEquals("RM mil", AnnualFigureKey.REVENUE.canonicalUnit());
    }

    @Test
    void lostTimeInjuriesAreCountedAsCases() {
        assertEquals("Cases", AnnualFigureKey.LOST_TIME_INJURIES.canonicalUnit());
    }
}
