/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import com.wesee.esg.climate.dto.EmissionPointDto;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The three decisions in the climate package that put a number in front of a regulator.
 *
 * <p>Every case here is one a person could check with a calculator and a copy of the factor table,
 * which is the point: an emissions figure nobody can reproduce by hand is not auditable.
 */
class EmissionMathTest {

    // ---- quantity x factor -> tCO2e -------------------------------------------------------

    /**
     * The demo's own electricity figure, which is also the arithmetic a Malaysian company will
     * check first: TNB bills in kWh, the grid factor is published in kg CO2e per kWh, and the
     * report is in tonnes.
     */
    @Test
    void convertsABillToTonnes() {
        BigDecimal kwh = new BigDecimal("912446");
        BigDecimal gridFactor = new BigDecimal("0.585000");   // kg CO2e per kWh

        assertEquals(new BigDecimal("533.7809"), EmissionMath.tco2e(kwh, gridFactor));
    }

    /** Each meter on its own, summing to the combined figure above — a reviewer will check this. */
    @Test
    void theTwoMetersSumToTheCombinedFigure() {
        BigDecimal factor = new BigDecimal("0.585000");
        BigDecimal siteA = EmissionMath.tco2e(new BigDecimal("744747"), factor);
        BigDecimal siteB = EmissionMath.tco2e(new BigDecimal("167699"), factor);

        assertEquals(new BigDecimal("435.6770"), siteA);
        assertEquals(new BigDecimal("98.1039"), siteB);
        // 435.6770 + 98.1039 = 533.7809, the same as billing them together. Rounding each meter
        // separately must not drift from rounding the total.
        assertEquals(EmissionMath.tco2e(new BigDecimal("912446"), factor), siteA.add(siteB));
    }

    /** Four decimal places, half up — stated here so a change to either is a failing test. */
    @Test
    void roundsToFourDecimalPlacesHalfUp() {
        // 1 x 0.00012345 kg = 0.00012345 t before scaling... work in kg: 0.12345 kg = 0.00012345 t
        assertEquals(new BigDecimal("0.0001"), EmissionMath.tco2e(BigDecimal.ONE, new BigDecimal("0.123450")));
        // Exactly half at the fifth place rounds up, not to even. 0.25 kg is the case that tells
        // the two apart: HALF_UP gives 0.0003, HALF_EVEN gives 0.0002.
        assertEquals(new BigDecimal("0.0003"), EmissionMath.tco2e(BigDecimal.ONE, new BigDecimal("0.250000")));
    }

    @Test
    void zeroActivityIsZeroEmissions() {
        assertEquals(new BigDecimal("0.0000"), EmissionMath.tco2e(BigDecimal.ZERO, new BigDecimal("0.585000")));
    }

    /**
     * A negative quantity is a correction, not an error — a reversed meter reading or a credited
     * bill — and it must reduce the total rather than be silently dropped.
     */
    @Test
    void aNegativeQuantityReducesTheTotal() {
        assertEquals(new BigDecimal("-58.5000"),
                EmissionMath.tco2e(new BigDecimal("-100000"), new BigDecimal("0.585000")));
    }

    @Test
    void refusesMissingInputsRatherThanTreatingThemAsZero() {
        assertThrows(IllegalArgumentException.class,
                () -> EmissionMath.tco2e(null, new BigDecimal("0.585000")));
        assertThrows(IllegalArgumentException.class,
                () -> EmissionMath.tco2e(new BigDecimal("100"), null));
    }

    // ---- entered vs derived ---------------------------------------------------------------

    /** A figure someone signed must never be rewritten by a bill that was accepted later. */
    @Test
    void anEnteredFigureWinsForItsYear() {
        List<EmissionPointDto> series = EmissionMath.mergeSeries(
                Map.of(2024, new BigDecimal("500.0000")),
                Map.of(2024, new BigDecimal("533.7809")));

        assertEquals(1, series.size());
        assertEquals(new BigDecimal("500.0000"), series.get(0).value());
        assertFalse(series.get(0).derived(), "an entered figure must not be flagged as derived");
    }

    /** A year with no entered figure falls back to the activity total, flagged as derived. */
    @Test
    void aYearWithNoEnteredFigureUsesTheActivityTotal() {
        List<EmissionPointDto> series = EmissionMath.mergeSeries(
                Map.of(),
                Map.of(2024, new BigDecimal("533.7809")));

        assertEquals(new BigDecimal("533.7809"), series.get(0).value());
        assertTrue(series.get(0).derived());
    }

    @Test
    void yearsComeBackInOrderWithNoDuplicates() {
        List<EmissionPointDto> series = EmissionMath.mergeSeries(
                Map.of(2024, new BigDecimal("1"), 2022, new BigDecimal("2")),
                Map.of(2023, new BigDecimal("3"), 2024, new BigDecimal("4")));

        assertEquals(List.of(2022, 2023, 2024), series.stream().map(EmissionPointDto::fiscalYear).toList());
        assertEquals(new BigDecimal("1"), series.get(2).value(), "2024 was entered, so entered wins");
    }

    @Test
    void noFiguresAtAllIsAnEmptySeriesNotAZeroYear() {
        assertTrue(EmissionMath.mergeSeries(Map.of(), Map.of()).isEmpty());
    }

    // ---- reporting relief ------------------------------------------------------------------

    /**
     * Bursa's phased rollout gives a newly-reporting company a grace period on Scope 3. Getting
     * the boundary wrong either exempts a company that must report or demands a figure from one
     * that need not — both are wrong in front of a regulator.
     */
    @Test
    void reliefCoversTheYearsFromFirstReportingYearInclusive() {
        assertTrue(EmissionMath.isInRelief(2025, 2025, 2), "the first reporting year is covered");
        assertTrue(EmissionMath.isInRelief(2026, 2025, 2), "the second of two years is covered");
    }

    @Test
    void reliefEndsAfterItsLastYear() {
        assertFalse(EmissionMath.isInRelief(2027, 2025, 2), "two years of relief end after 2026");
    }

    @Test
    void aYearBeforeReportingBeganIsNotInRelief() {
        assertFalse(EmissionMath.isInRelief(2024, 2025, 2));
    }

    @Test
    void noReliefYearsMeansNoRelief() {
        assertFalse(EmissionMath.isInRelief(2025, 2025, 0));
        assertFalse(EmissionMath.isInRelief(2025, 2025, -1));
    }
}
