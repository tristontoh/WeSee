/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root - visibility is not a licence to use.
 */
package com.wesee.esg.reference;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * One answer to "may a person write this indicator's value", so that every write door asks the
 * same question. Adding DERIVED left setValue guarded and setMonthlyValue and the extraction
 * accept path unguarded, which turned a ratio into a 500 instead of a 409.
 */
class AggregationRuleTest {

    @Test
    void aDerivedIndicatorIsNeverHandEntered() {
        assertFalse(AggregationRule.DERIVED.isHandEntered());
    }

    @Test
    void everyOtherRuleIsHandEnteredSomewhere() {
        for (AggregationRule rule : AggregationRule.values()) {
            if (rule != AggregationRule.DERIVED) {
                assertTrue(rule.isHandEntered(), rule + " should be writable by a person");
            }
        }
    }
}
