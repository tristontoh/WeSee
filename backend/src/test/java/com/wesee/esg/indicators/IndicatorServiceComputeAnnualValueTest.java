/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators;

import com.wesee.esg.reference.AggregationRule;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class IndicatorServiceComputeAnnualValueTest {

    @Test
    void sumAddsAllEnteredMonths() {
        var monthly = monthlyValues(new BigDecimal("10"), new BigDecimal("15.5"), new BigDecimal("4.5"));
        assertEquals(new BigDecimal("30.0"), IndicatorService.computeAnnualValue(AggregationRule.SUM, monthly));
    }

    @Test
    void countBehavesIdenticallyToSum() {
        var monthly = monthlyValues(new BigDecimal("2"), new BigDecimal("1"), new BigDecimal("3"));
        assertEquals(new BigDecimal("6"), IndicatorService.computeAnnualValue(AggregationRule.COUNT, monthly));
    }

    @Test
    void averageDividesByNumberOfEnteredMonths() {
        var monthly = monthlyValues(new BigDecimal("10"), new BigDecimal("20"), new BigDecimal("30"));
        assertEquals(new BigDecimal("20.0000"), IndicatorService.computeAnnualValue(AggregationRule.AVERAGE, monthly));
    }

    @Test
    void latestTakesTheValueFromTheHighestMonthNumber() {
        IndicatorMonthlyValue jan = monthlyValue(1, new BigDecimal("100"));
        IndicatorMonthlyValue mar = monthlyValue(3, new BigDecimal("150"));
        IndicatorMonthlyValue feb = monthlyValue(2, new BigDecimal("120"));
        assertEquals(new BigDecimal("150"), IndicatorService.computeAnnualValue(AggregationRule.LATEST, List.of(jan, mar, feb)));
    }

    @Test
    void nullValuedMonthsAreIgnored() {
        IndicatorMonthlyValue entered = monthlyValue(1, new BigDecimal("50"));
        IndicatorMonthlyValue notEntered = monthlyValue(2, null);
        assertEquals(new BigDecimal("50"), IndicatorService.computeAnnualValue(AggregationRule.SUM, List.of(entered, notEntered)));
    }

    @Test
    void emptyOrAllNullMonthsReturnNull() {
        assertNull(IndicatorService.computeAnnualValue(AggregationRule.SUM, List.of()));
        assertNull(IndicatorService.computeAnnualValue(AggregationRule.LATEST, List.of(monthlyValue(1, null))));
    }

    @Test
    void directAnnualNeverReachesAggregation() {
        assertThrows(IllegalStateException.class,
                () -> IndicatorService.computeAnnualValue(AggregationRule.DIRECT_ANNUAL, monthlyValues(BigDecimal.ONE)));
    }

    private List<IndicatorMonthlyValue> monthlyValues(BigDecimal... values) {
        return java.util.stream.IntStream.range(0, values.length)
                .mapToObj(i -> monthlyValue(i + 1, values[i]))
                .toList();
    }

    private IndicatorMonthlyValue monthlyValue(int month, BigDecimal value) {
        IndicatorMonthlyValue m = new IndicatorMonthlyValue();
        m.setMonth(month);
        m.setValue(value);
        return m;
    }
}
