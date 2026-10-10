/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DerivationCatalogueCheckTest {

    @Test
    void keysThatAllExistPass() {
        assertDoesNotThrow(() -> DerivationCatalogueCheck.verify(
                List.of("ENERGY_INTENSITY_REVENUE", "VOLUNTARY_TURNOVER_RATE")));
    }

    @Test
    void anUnknownKeyFailsAndIsNamed() {
        IllegalStateException e = assertThrows(IllegalStateException.class, () ->
                DerivationCatalogueCheck.verify(List.of("ENERGY_INTENSITY_REVENUE", "TYPO_RATE")));
        assertTrue(e.getMessage().contains("TYPO_RATE"), e.getMessage());
    }

    @Test
    void everyUnknownKeyIsNamedNotJustTheFirst() {
        IllegalStateException e = assertThrows(IllegalStateException.class, () ->
                DerivationCatalogueCheck.verify(List.of("TYPO_ONE", "TYPO_TWO")));
        assertTrue(e.getMessage().contains("TYPO_ONE"), e.getMessage());
        assertTrue(e.getMessage().contains("TYPO_TWO"), e.getMessage());
    }

    @Test
    void theSameUnknownKeyTwiceIsNamedOnce() {
        IllegalStateException e = assertThrows(IllegalStateException.class, () ->
                DerivationCatalogueCheck.verify(List.of("TYPO_ONE", "TYPO_ONE")));
        assertEquals(1, e.getMessage().split("TYPO_ONE", -1).length - 1, e.getMessage());
    }

    @Test
    void anEmptyCatalogueIsFine() {
        assertDoesNotThrow(() -> DerivationCatalogueCheck.verify(List.of()));
    }

    @Test
    void aNullKeyInTheListIsIgnoredRatherThanCrashing() {
        List<String> withNull = new java.util.ArrayList<>();
        withNull.add("ENERGY_INTENSITY_REVENUE");
        withNull.add(null);
        assertDoesNotThrow(() -> DerivationCatalogueCheck.verify(withNull));
    }

    @Test
    void theMessageListsWhatTheRegistryDoesKnowSoTheFixIsObvious() {
        IllegalStateException e = assertThrows(IllegalStateException.class, () ->
                DerivationCatalogueCheck.verify(List.of("TYPO_RATE")));
        assertTrue(e.getMessage().contains("ENERGY_INTENSITY_REVENUE"), e.getMessage());
        assertFalse(DerivationRegistry.keys().isEmpty());
    }

    private static void assertEquals(int expected, int actual, String message) {
        org.junit.jupiter.api.Assertions.assertEquals(expected, actual, message);
    }
}
