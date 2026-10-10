/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import com.wesee.esg.climate.dto.EmissionPointDto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * The arithmetic behind every emissions figure this platform reports.
 *
 * <p>Pure functions rather than lines inside a service, for the reason the derivation registry is
 * one: these are the numbers a regulator sees, and a number that can only be exercised by standing
 * up Spring and a database is a number nobody checks. Everything here can be verified against a
 * calculator and a copy of the factor table.
 */
public final class EmissionMath {

    /** Emission factors are published per kg CO2e; reports are in tonnes. */
    private static final BigDecimal KG_PER_TONNE = BigDecimal.valueOf(1000);

    /** Four decimals of a tonne is 100 g — below any factor's own precision, and stable to sum. */
    public static final int TCO2E_SCALE = 4;

    private EmissionMath() {
    }

    /**
     * Activity quantity times its emission factor, in tonnes CO2e.
     *
     * @param quantity    the metered activity, in the factor's own unit (kWh, litres, km)
     * @param factorValue kg CO2e per unit of that activity
     * @throws IllegalArgumentException if either is missing — a missing factor is a configuration
     *                                  fault, and treating it as zero would report zero emissions
     *                                  for real consumption
     */
    public static BigDecimal tco2e(BigDecimal quantity, BigDecimal factorValue) {
        if (quantity == null || factorValue == null) {
            throw new IllegalArgumentException(
                    "Both an activity quantity and an emission factor are needed to compute tCO2e");
        }
        return quantity.multiply(factorValue).divide(KG_PER_TONNE, TCO2E_SCALE, RoundingMode.HALF_UP);
    }

    /**
     * One scope's figures per year, from the two places they can come from.
     *
     * <p>A figure entered by hand wins for the year it covers — accepting a bill must never quietly
     * rewrite a number somebody put their name to. A year with no entered figure falls back to the
     * total of that scope's accepted activity entries, flagged {@code derived} so the screen can
     * say where it came from.
     *
     * @return one point per year present in either map, ascending
     */
    public static List<EmissionPointDto> mergeSeries(Map<Integer, BigDecimal> entered,
                                                     Map<Integer, BigDecimal> derived) {
        return Stream.concat(entered.keySet().stream(), derived.keySet().stream())
                .distinct()
                .sorted()
                .map(year -> entered.containsKey(year)
                        ? new EmissionPointDto(year, entered.get(year), false)
                        : new EmissionPointDto(year, derived.get(year), true))
                .toList();
    }

    /**
     * Whether a fiscal year falls inside a newly-reporting company's grace period.
     *
     * <p>Inclusive of {@code firstReportingYear} and exclusive of the year {@code reliefYears}
     * later: two years of relief from 2025 cover 2025 and 2026, and 2027 must report.
     */
    public static boolean isInRelief(int fiscalYear, int firstReportingYear, int reliefYears) {
        return reliefYears > 0
                && fiscalYear >= firstReportingYear
                && (fiscalYear - firstReportingYear) < reliefYears;
    }
}
