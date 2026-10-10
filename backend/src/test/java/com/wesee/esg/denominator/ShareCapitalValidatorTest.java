/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ShareCapitalValidatorTest {

    @Test
    void anOrdinaryCapitalStructureIsAccepted() {
        assertDoesNotThrow(() -> ShareCapitalValidator.validate(
                new BigDecimal("1000000"), new BigDecimal("250000"), new BigDecimal("300000")));
    }

    /** Review Focus 5. A free float above 100% is impossible and would reach a regulator. */
    @Test
    void publicHoldingAboveTheTotalIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                ShareCapitalValidator.validate(
                        new BigDecimal("1000000"), new BigDecimal("1200000"), BigDecimal.ZERO));
        assertTrue(e.getMessage().toLowerCase().contains("public"), e.getMessage());
    }

    @Test
    void bumiputeraHoldingAboveTheTotalIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                ShareCapitalValidator.validate(
                        new BigDecimal("1000000"), BigDecimal.ZERO, new BigDecimal("1200000")));
        assertTrue(e.getMessage().toLowerCase().contains("bumiputera"), e.getMessage());
    }

    /**
     * Public and bumiputera holdings overlap — a bumiputera public shareholder is both — so their
     * sum exceeding the total is not by itself an error. Only each one individually is bounded.
     */
    @Test
    void publicAndBumiputeraMayOverlapAndSumAboveTheTotal() {
        assertDoesNotThrow(() -> ShareCapitalValidator.validate(
                new BigDecimal("1000000"), new BigDecimal("700000"), new BigDecimal("600000")));
    }

    @Test
    void aNegativeHoldingIsRefused() {
        assertThrows(IllegalArgumentException.class, () -> ShareCapitalValidator.validate(
                new BigDecimal("1000000"), new BigDecimal("-1"), BigDecimal.ZERO));
    }

    @Test
    void zeroTotalSharesIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                ShareCapitalValidator.validate(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
        assertTrue(e.getMessage().toLowerCase().contains("outstanding"), e.getMessage());
    }

    /**
     * A single holder cannot own more shares than exist. Without this the concentration ratio the
     * register feeds computes 500% — the same shape as the 103% in IND-WAT-02, in the one table
     * where the bound is sitting in the adjacent row.
     */
    @Test
    void aHolderCannotOwnMoreSharesThanExist() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                ShareCapitalValidator.requireHoldingWithinCapital(
                        "Founder Holdings", new BigDecimal("5000000"), new BigDecimal("1000000")));
        assertTrue(e.getMessage().contains("Founder Holdings"), e.getMessage());
        assertTrue(e.getMessage().contains("1000000"), e.getMessage());
    }

    @Test
    void aHolderOwningTheWholeCompanyIsAccepted() {
        assertDoesNotThrow(() -> ShareCapitalValidator.requireHoldingWithinCapital(
                "Sole Owner", new BigDecimal("1000000"), new BigDecimal("1000000")));
    }

    /**
     * With no capital structure recorded there is no bound to check against. Refusing here would
     * force the two screens to be filled in one order only.
     */
    @Test
    void aHoldingIsAcceptedWhenNoCapitalStructureIsRecordedYet() {
        assertDoesNotThrow(() -> ShareCapitalValidator.requireHoldingWithinCapital(
                "Early Entry", new BigDecimal("5000000"), null));
    }

    @Test
    void holdingExactlyTheWholeCompanyIsAccepted() {
        assertDoesNotThrow(() -> ShareCapitalValidator.validate(
                new BigDecimal("1000000"), new BigDecimal("1000000"), new BigDecimal("1000000")));
    }
}
