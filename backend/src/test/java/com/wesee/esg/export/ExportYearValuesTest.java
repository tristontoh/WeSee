/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root - visibility is not a licence to use.
 */
package com.wesee.esg.export;

import com.wesee.esg.indicators.IndicatorValue;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

class ExportYearValuesTest {

    private static IndicatorValue value(int fiscalYear, String value) {
        IndicatorValue v = new IndicatorValue();
        v.setFiscalYear(fiscalYear);
        v.setValue(value == null ? null : new BigDecimal(value));
        return v;
    }

    @Test
    void anOrdinarySeriesMapsYearToValue() {
        Map<Integer, BigDecimal> m = ExportService.yearValues(
                List.of(value(2024, "10.0"), value(2025, "20.0")));
        assertEquals(new BigDecimal("10.0"), m.get(2024));
        assertEquals(new BigDecimal("20.0"), m.get(2025));
    }

    /**
     * A derived indicator whose inputs went missing stores a row with a NULL value. Before derived
     * indicators existed that was unreachable, and Collectors.toMap - which routes through
     * HashMap.merge - throws NullPointerException on one. The whole CSV then 500s for every user
     * in the tenant until somebody re-enters the figure.
     */
    @Test
    void aNullValuedRowDoesNotBlowUpTheWholeExport() {
        Map<Integer, BigDecimal> m = ExportService.yearValues(
                List.of(value(2024, "10.0"), value(2025, null)));
        assertEquals(new BigDecimal("10.0"), m.get(2024));
        assertNull(m.get(2025));
    }

    @Test
    void aYearWithOnlyANullValueIsAbsentRatherThanPresentAndNull() {
        // The row renderer two lines below the collector writes "" for an absent key, so an
        // absent key is the shape the rest of the method already expects.
        Map<Integer, BigDecimal> m = ExportService.yearValues(List.of(value(2025, null)));
        assertFalse(m.containsKey(2025));
    }

    @Test
    void anEmptySeriesIsAnEmptyMap() {
        assertEquals(Map.of(), ExportService.yearValues(List.of()));
    }

    @Test
    void aLaterRowForTheSameYearWins() {
        Map<Integer, BigDecimal> m = ExportService.yearValues(
                List.of(value(2025, "1.0"), value(2025, "2.0")));
        assertEquals(new BigDecimal("2.0"), m.get(2025));
    }
}
