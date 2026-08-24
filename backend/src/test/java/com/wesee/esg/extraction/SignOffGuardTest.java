package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SignOffGuardTest {

    @Test
    void aYearWithASignOffIsLocked() {
        assertTrue(SignOffGuard.isYearLocked(2025, Set.of(2025)));
    }

    @Test
    void aYearWithoutASignOffIsOpen() {
        assertFalse(SignOffGuard.isYearLocked(2026, Set.of(2025)));
    }

    @Test
    void noSignOffsAtAllMeansEveryYearIsOpen() {
        assertFalse(SignOffGuard.isYearLocked(2026, Set.of()));
    }

    @Test
    void aNullYearIsTreatedAsOpenSoValidationElsewhereReportsIt() {
        assertFalse(SignOffGuard.isYearLocked(null, Set.of(2025)));
    }
}
