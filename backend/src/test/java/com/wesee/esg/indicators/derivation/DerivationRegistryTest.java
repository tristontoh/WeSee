/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.denominator.AnnualFigureKey;
import com.wesee.esg.denominator.BoardMember;
import com.wesee.esg.indicators.DerivationState;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DerivationRegistryTest {

    private static DerivationInputs inputs(Map<String, BigDecimal> indicators,
                                           Map<String, String> units,
                                           Map<AnnualFigureKey, BigDecimal> figures,
                                           List<BoardMember> board) {
        return new DerivationInputs(indicators, units, figures, board);
    }

    private static BoardMember director(String name, String gender) {
        BoardMember m = new BoardMember();
        m.setName(name);
        m.setGender(gender);
        m.setIndependent(false);
        return m;
    }

    @Test
    void theRegistryHoldsElevenDerivations() {
        assertEquals(11, DerivationRegistry.keys().size());
    }

    /**
     * Every formula must say what unit it produces, so DerivationCatalogueUnitsTest can refuse a
     * percentage formula pointed at an indicator recorded in MYR.
     */
    @Test
    void everyDerivationDeclaresTheUnitItProduces() {
        for (String key : DerivationRegistry.keys()) {
            String unit = DerivationRegistry.get(key).outputUnit();
            assertTrue(unit != null && !unit.isBlank(), key + " does not say what unit it produces");
        }
    }

    /** Review Focus 5. A key in a migration that names nothing must fail loudly. */
    @Test
    void anUnknownKeyThrowsRatherThanReturningNull() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> DerivationRegistry.get("NO_SUCH_FORMULA"));
        assertTrue(e.getMessage().contains("NO_SUCH_FORMULA"), e.getMessage());
    }

    @Test
    void everyDerivationDeclaresItsFormula() {
        for (String key : DerivationRegistry.keys()) {
            String formula = DerivationRegistry.get(key).formula();
            assertTrue(formula != null && !formula.isBlank(), key + " has no formula text");
        }
    }

    @Test
    void energyIntensityDividesElectricityByRevenue() {
        DerivationResult r = DerivationRegistry.get("ENERGY_INTENSITY_REVENUE").compute(inputs(
                Map.of("IND-ENG-01", new BigDecimal("912.4460")),
                Map.of("IND-ENG-01", "MWh"),
                Map.of(AnnualFigureKey.REVENUE, new BigDecimal("48.0000")),
                List.of()));
        assertEquals(DerivationState.COMPUTED, r.state());
        assertEquals(new BigDecimal("19.0093"), r.value());
        assertTrue(r.explanation().contains("912.4460"), r.explanation());
        assertTrue(r.explanation().contains("48.0000"), r.explanation());
    }

    /** Review Focus 1. kWh entered where the formula wants MWh must convert, not be 1000x wrong. */
    @Test
    void energyIntensityConvertsAnInputRecordedInKilowattHours() {
        DerivationResult r = DerivationRegistry.get("ENERGY_INTENSITY_REVENUE").compute(inputs(
                Map.of("IND-ENG-01", new BigDecimal("912446")),
                Map.of("IND-ENG-01", "kWh"),
                Map.of(AnnualFigureKey.REVENUE, new BigDecimal("48.0000")),
                List.of()));
        assertEquals(new BigDecimal("19.0093"), r.value());
    }

    @Test
    void carbonIntensitySumsBothScopesBeforeDividing() {
        DerivationResult r = DerivationRegistry.get("CARBON_INTENSITY_REVENUE").compute(inputs(
                Map.of("IND-ENG-02", new BigDecimal("443.5600"),
                       "IND-ENG-03", new BigDecimal("533.7800")),
                Map.of("IND-ENG-02", "tCO2e", "IND-ENG-03", "tCO2e"),
                Map.of(AnnualFigureKey.REVENUE, new BigDecimal("48.0000")),
                List.of()));
        // 443.56 + 533.78 = 977.34, / 48 = 20.3613 (the demo's own arithmetic)
        assertEquals(new BigDecimal("20.3613"), r.value());
    }

    @Test
    void aMissingDenominatorReportsWhichFigureIsWanted() {
        DerivationResult r = DerivationRegistry.get("ENERGY_INTENSITY_REVENUE").compute(inputs(
                Map.of("IND-ENG-01", new BigDecimal("912.4460")),
                Map.of("IND-ENG-01", "MWh"),
                Map.of(),
                List.of()));
        assertEquals(DerivationState.AWAITING_INPUTS, r.state());
        assertNull(r.value());
        assertEquals(1, r.missing().size());
        assertTrue(r.missing().get(0).toLowerCase().contains("revenue"), r.missing().toString());
    }

    @Test
    void twoMissingInputsAreBothNamed() {
        DerivationResult r = DerivationRegistry.get("ENERGY_INTENSITY_REVENUE")
                .compute(inputs(Map.of(), Map.of(), Map.of(), List.of()));
        assertEquals(DerivationState.AWAITING_INPUTS, r.state());
        assertEquals(2, r.missing().size());
    }

    @Test
    void femaleBoardRatioCountsTheRoster() {
        DerivationResult r = DerivationRegistry.get("FEMALE_BOARD_RATIO").compute(inputs(
                Map.of(), Map.of(), Map.of(),
                List.of(director("A", "FEMALE"), director("B", "MALE"),
                        director("C", "MALE"), director("D", "FEMALE"))));
        assertEquals(new BigDecimal("50.00"), r.value());
    }

    @Test
    void anEmptyBoardIsAwaitingInputsRatherThanDividingByZero() {
        DerivationResult r = DerivationRegistry.get("FEMALE_BOARD_RATIO")
                .compute(inputs(Map.of(), Map.of(), Map.of(), List.of()));
        assertEquals(DerivationState.AWAITING_INPUTS, r.state());
    }

    @Test
    void lostTimeIncidentRateUsesInjuriesAndHours() {
        DerivationResult r = DerivationRegistry.get("LOST_TIME_INCIDENT_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.LOST_TIME_INJURIES, new BigDecimal("3"),
                       AnnualFigureKey.TOTAL_HOURS_WORKED, new BigDecimal("1200000")),
                List.of()));
        assertEquals(new BigDecimal("0.5000"), r.value());
    }



    @Test
    void voluntaryTurnoverDividesDeparturesByHeadcount() {
        DerivationResult r = DerivationRegistry.get("VOLUNTARY_TURNOVER_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.EMPLOYEE_DEPARTURES, new BigDecimal("6"),
                       AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("50")),
                List.of()));
        assertEquals(new BigDecimal("12.00"), r.value());
    }

    @Test
    void trainingHoursPerEmployeeIsARateNotAPercentage() {
        DerivationResult r = DerivationRegistry.get("TRAINING_HOURS_PER_EMPLOYEE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.TOTAL_TRAINING_HOURS, new BigDecimal("1250"),
                       AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("50")),
                List.of()));
        assertEquals(new BigDecimal("25.0000"), r.value());
    }

    /**
     * The test that decides whether this ships. IND-WAT-02 holds 103% today. A recycling rate
     * that cannot be a recycling rate must be refused with both inputs named — a clamp to 100
     * would hide the bad data behind a figure that looks fine.
     */
    @Test
    void waterRecyclingRefusesAnImpossibleRateAndNamesTheInputs() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                DerivationRegistry.get("WATER_RECYCLING_RATE").compute(inputs(
                        Map.of("IND-WAT-01", new BigDecimal("-100")),
                        Map.of("IND-WAT-01", "m3"),
                        Map.of(AnnualFigureKey.RECYCLED_WATER_VOLUME, new BigDecimal("500")),
                        List.of())));
        assertTrue(e.getMessage().contains("500"), e.getMessage());
    }

    @Test
    void waterRecyclingDividesRecycledByTheTotalItIsPartOf() {
        DerivationResult r = DerivationRegistry.get("WATER_RECYCLING_RATE").compute(inputs(
                Map.of("IND-WAT-01", new BigDecimal("750")),
                Map.of("IND-WAT-01", "m3"),
                Map.of(AnnualFigureKey.RECYCLED_WATER_VOLUME, new BigDecimal("250")),
                List.of()));
        // 250 / (250 + 750) = 25%
        assertEquals(new BigDecimal("25.00"), r.value());
    }

    @Test
    void siteCoverageDividesAssessedSitesByTotalSites() {
        DerivationResult r = DerivationRegistry.get("CLIMATE_RISK_SITE_COVERAGE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.SITES_CLIMATE_RISK_ASSESSED, new BigDecimal("3"),
                       AnnualFigureKey.OPERATIONAL_SITES, new BigDecimal("4")),
                List.of()));
        assertEquals(new BigDecimal("75.00"), r.value());
    }

    @Test
    void supplierAssessmentDividesAssessedByTierOneCount() {
        DerivationResult r = DerivationRegistry.get("SUPPLIER_ASSESSMENT_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.TIER1_SUPPLIERS_ASSESSED, new BigDecimal("18"),
                       AnnualFigureKey.TIER1_SUPPLIERS, new BigDecimal("24")),
                List.of()));
        assertEquals(new BigDecimal("75.00"), r.value());
    }

    @Test
    void anticorruptionTrainingDividesTrainedByHeadcount() {
        DerivationResult r = DerivationRegistry.get("ANTICORRUPTION_TRAINING_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.EMPLOYEES_TRAINED_ANTICORRUPTION, new BigDecimal("45"),
                       AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("50")),
                List.of()));
        assertEquals(new BigDecimal("90.00"), r.value());
    }

    @Test
    void materialConversionDividesConvertedByInput() {
        DerivationResult r = DerivationRegistry.get("MATERIAL_CONVERSION_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.RAW_MATERIAL_CONVERTED, new BigDecimal("880"),
                       AnnualFigureKey.RAW_MATERIAL_INPUT, new BigDecimal("1000")),
                List.of()));
        assertEquals(new BigDecimal("88.00"), r.value());
    }


    @Test
    void everyDerivationWithNoInputsAtAllIsAwaitingRatherThanThrowing() {
        DerivationInputs empty = inputs(Map.of(), Map.of(), Map.of(), List.of());
        for (String key : DerivationRegistry.keys()) {
            DerivationResult r = DerivationRegistry.get(key).compute(empty);
            assertEquals(DerivationState.AWAITING_INPUTS, r.state(), key + " did not report awaiting");
            assertFalse(r.missing().isEmpty(), key + " reported awaiting without naming anything");
        }
    }

    @Test
    void aZeroDenominatorIsAwaitingAndSaysWhichFigureIsZero() {
        DerivationResult r = DerivationRegistry.get("VOLUNTARY_TURNOVER_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.EMPLOYEE_DEPARTURES, new BigDecimal("6"),
                       AnnualFigureKey.AVERAGE_HEADCOUNT, BigDecimal.ZERO),
                List.of()));
        assertEquals(DerivationState.AWAITING_INPUTS, r.state());
        assertTrue(r.missing().get(0).toLowerCase().contains("zero"), r.missing().toString());
    }
}
