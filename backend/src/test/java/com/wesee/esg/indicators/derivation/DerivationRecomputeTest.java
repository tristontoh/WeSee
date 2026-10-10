/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.indicators.DerivationState;
import com.wesee.esg.indicators.IndicatorValueStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DerivationRecomputeTest {

    @Test
    void anUnchangedNumberIsNotAChange() {
        assertFalse(DerivationService.isChange(new BigDecimal("25.00"), new BigDecimal("25.00")));
    }

    @Test
    void aDifferentNumberIsAChange() {
        assertTrue(DerivationService.isChange(new BigDecimal("25.00"), new BigDecimal("26.00")));
    }

    @Test
    void trailingZeroesDoNotCountAsAChange() {
        assertFalse(DerivationService.isChange(new BigDecimal("25.0"), new BigDecimal("25.00")));
    }

    @Test
    void firstComputationOverANullIsAChange() {
        assertTrue(DerivationService.isChange(null, new BigDecimal("25.00")));
    }

    @Test
    void losingAValueBecauseAnInputWasDeletedIsAChange() {
        assertTrue(DerivationService.isChange(new BigDecimal("25.00"), null));
    }

    @Test
    void nothingToNothingIsNotAChange() {
        assertFalse(DerivationService.isChange(null, null));
    }

    /** Review Focus 3. A figure computed from unapproved inputs cannot arrive pre-approved. */
    @Test
    void aRecomputedValueIsAlwaysDraft() {
        assertEquals(IndicatorValueStatus.DRAFT, DerivationService.statusAfterRecompute());
    }

    @Test
    void anAwaitingResultClearsTheStoredValue() {
        assertTrue(DerivationService.clearsStoredValue(DerivationState.AWAITING_INPUTS));
        assertFalse(DerivationService.clearsStoredValue(DerivationState.COMPUTED));
    }

    /**
     * A value typed in before the indicator became derived is kept until a real computation can
     * replace it. Clearing it would erase what somebody may have signed off against.
     */
    @Test
    void aSupersededManualValueIsNotClearedByAMissingInput() {
        assertFalse(DerivationService.clearsStoredValue(DerivationState.SUPERSEDED_MANUAL));
    }

    @Test
    void aSupersededManualValueIsLeftAloneWhenInputsAreStillMissing() {
        assertTrue(DerivationService.leavesSupersededValueAlone(
                DerivationState.SUPERSEDED_MANUAL, DerivationState.AWAITING_INPUTS));
    }

    @Test
    void aSupersededManualValueIsReplacedOnceARealComputationExists() {
        assertFalse(DerivationService.leavesSupersededValueAlone(
                DerivationState.SUPERSEDED_MANUAL, DerivationState.COMPUTED));
    }

    /**
     * Review Focus 4. The codebase already treats a signed fiscal year as locked — extraction
     * refuses to write into one (SignOffGuard.isYearLocked). A recomputation must obey the same
     * rule, or a changed denominator would silently rewrite a figure somebody attested to under a
     * SHA-256 hash.
     */
    @Test
    void aSignedFiscalYearIsLockedAgainstRecomputation() {
        assertTrue(DerivationService.isLocked(java.util.Set.of(2025), 2025));
    }

    @Test
    void anUnsignedFiscalYearRecomputesFreely() {
        assertFalse(DerivationService.isLocked(java.util.Set.of(2024), 2025));
        assertFalse(DerivationService.isLocked(java.util.Set.of(), 2025));
    }

    @Test
    void anOrdinaryComputedValueIsNeverLeftAlone() {
        assertFalse(DerivationService.leavesSupersededValueAlone(
                DerivationState.COMPUTED, DerivationState.AWAITING_INPUTS));
    }
}
