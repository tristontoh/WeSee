package com.wesee.esg.extraction;

import com.wesee.esg.reference.AggregationRule;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Accepting a bill used to write the annual figure directly, so a second month replaced the first
 * instead of adding to it — twelve electricity bills left the year showing only December. A dated
 * reading now goes into the monthly ledger and the year is recomputed from it.
 */
class ExtractionReviewRoutingTest {

    @Test
    void aDatedReadingOnAnAggregatingIndicatorGoesThroughTheMonthlyLedger() {
        // The two a utility bill actually fills.
        assertTrue(ExtractionReviewService.routesThroughMonthly(AggregationRule.SUM, 2));
        assertTrue(ExtractionReviewService.routesThroughMonthly(AggregationRule.AVERAGE, 12));
        assertTrue(ExtractionReviewService.routesThroughMonthly(AggregationRule.LATEST, 1));
        assertTrue(ExtractionReviewService.routesThroughMonthly(AggregationRule.COUNT, 6));
    }

    /** setMonthlyValue rejects these outright, so routing one there would turn an accept into a 409. */
    @Test
    void aDirectAnnualIndicatorStillWritesTheYear() {
        assertFalse(ExtractionReviewService.routesThroughMonthly(AggregationRule.DIRECT_ANNUAL, 2));
    }

    /** A document with no period on it has no month to file the reading under. */
    @Test
    void anUndatedReadingStillWritesTheYear() {
        assertFalse(ExtractionReviewService.routesThroughMonthly(AggregationRule.SUM, null));
        assertFalse(ExtractionReviewService.routesThroughMonthly(AggregationRule.DIRECT_ANNUAL, null));
    }

    /** Older rows predate the aggregation column; treat an absent rule as the annual behaviour. */
    @Test
    void aMissingRuleFallsBackToWritingTheYear() {
        assertFalse(ExtractionReviewService.routesThroughMonthly(null, 3));
    }
}
