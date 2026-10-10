/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RatiosTest {

    @Test
    void aPercentageCarriesTwoDecimals() {
        assertEquals(new BigDecimal("33.33"), Ratios.percentage(new BigDecimal("1"), new BigDecimal("3")));
    }

    @Test
    void aPercentageRoundsHalfUp() {
        assertEquals(new BigDecimal("12.35"), Ratios.percentage(new BigDecimal("12.345"), new BigDecimal("100")));
    }

    @Test
    void aRateCarriesFourDecimals() {
        assertEquals(new BigDecimal("20.3615"), Ratios.rate(new BigDecimal("977.35"), new BigDecimal("48")));
    }

    /** Review Focus 2. Zero of something the company counted is a fact, not a gap. */
    @Test
    void aZeroNumeratorComputesZeroRatherThanNothing() {
        assertEquals(new BigDecimal("0.00"), Ratios.percentage(BigDecimal.ZERO, new BigDecimal("50")));
        assertEquals(new BigDecimal("0.0000"), Ratios.rate(BigDecimal.ZERO, new BigDecimal("50")));
    }

    @Test
    void aZeroDenominatorYieldsNullRatherThanInfinityOrAnException() {
        assertNull(Ratios.percentage(new BigDecimal("5"), BigDecimal.ZERO));
        assertNull(Ratios.rate(new BigDecimal("5"), BigDecimal.ZERO));
    }

    @Test
    void aNullInputYieldsNull() {
        assertNull(Ratios.percentage(null, new BigDecimal("50")));
        assertNull(Ratios.percentage(new BigDecimal("5"), null));
    }

    @Test
    void lostTimeIncidentRateUsesTheTwoHundredThousandHourBase() {
        // 3 injuries over 1,200,000 hours = 0.5 per 200,000 hours
        assertEquals(new BigDecimal("0.5000"),
                Ratios.perTwoHundredThousandHours(new BigDecimal("3"), new BigDecimal("1200000")));
    }

    @Test
    void aFullPercentageIsExactlyOneHundred() {
        assertEquals(new BigDecimal("100.00"), Ratios.percentage(new BigDecimal("50"), new BigDecimal("50")));
    }

    @Test
    void aPercentageAboveOneHundredIsRefusedRatherThanClamped() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                Ratios.percentage(new BigDecimal("60"), new BigDecimal("50")));
        assertTrue(e.getMessage().contains("60"), e.getMessage());
        assertTrue(e.getMessage().contains("50"), e.getMessage());
    }

    @Test
    void aNegativePercentageIsRefusedBecauseNoRatioHereCanBeBelowZero() {
        assertThrows(IllegalArgumentException.class, () ->
                Ratios.percentage(new BigDecimal("-5"), new BigDecimal("50")));
    }
}
