/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AllocationTest {

    @Test
    void aBuyerTakingAnEighthOfTheOutputTakesAnEighthOfTheFootprint() {
        BigDecimal share = Allocation.share(new BigDecimal("6000"), new BigDecimal("48000"));
        assertEquals(new BigDecimal("0.125000"), share);
        assertEquals(new BigDecimal("122.1675"),
                Allocation.allocate(new BigDecimal("443.5600"), new BigDecimal("533.7800"), share));
    }

    @Test
    void theWholeOutputTakesTheWholeFootprint() {
        BigDecimal share = Allocation.share(new BigDecimal("48000"), new BigDecimal("48000"));
        assertEquals(new BigDecimal("1.000000"), share);
        assertEquals(new BigDecimal("977.3400"),
                Allocation.allocate(new BigDecimal("443.5600"), new BigDecimal("533.7800"), share));
    }

    /**
     * Review Focus 3. Buying more than the supplier produced is impossible. Clamping the share to
     * 100% would silently hand the buyer the supplier's entire footprint and look reasonable.
     */
    @Test
    void buyingMoreThanTheSupplierProducedIsRefusedAndNamesBothNumbers() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> Allocation.share(new BigDecimal("60000"), new BigDecimal("48000")));
        assertTrue(e.getMessage().contains("60000"), e.getMessage());
        assertTrue(e.getMessage().contains("48000"), e.getMessage());
    }

    @Test
    void aZeroBasisIsRefusedRatherThanDividingByZero() {
        assertThrows(IllegalArgumentException.class,
                () -> Allocation.share(new BigDecimal("100"), BigDecimal.ZERO));
    }

    @Test
    void aNegativePurchaseIsRefused() {
        assertThrows(IllegalArgumentException.class,
                () -> Allocation.share(new BigDecimal("-1"), new BigDecimal("48000")));
    }

    @Test
    void aNullOnEitherSideIsRefused() {
        assertThrows(IllegalArgumentException.class,
                () -> Allocation.share(null, new BigDecimal("48000")));
        assertThrows(IllegalArgumentException.class,
                () -> Allocation.share(new BigDecimal("100"), null));
    }

    @Test
    void buyingNothingAllocatesNothing() {
        BigDecimal share = Allocation.share(BigDecimal.ZERO, new BigDecimal("48000"));
        assertEquals(new BigDecimal("0.000000"), share);
        assertEquals(new BigDecimal("0.0000"),
                Allocation.allocate(new BigDecimal("443.56"), new BigDecimal("533.78"), share));
    }

    @Test
    void theShareCarriesSixDecimalsSoASmallBuyerIsNotRoundedToZero() {
        assertEquals(new BigDecimal("0.000001"),
                Allocation.share(BigDecimal.ONE, new BigDecimal("1000000")));
    }

    @Test
    void bothScopesAreSummedBeforeTheShareIsApplied() {
        BigDecimal share = Allocation.share(new BigDecimal("24000"), new BigDecimal("48000"));
        assertEquals(new BigDecimal("488.6700"),
                Allocation.allocate(new BigDecimal("443.5600"), new BigDecimal("533.7800"), share));
    }
}
