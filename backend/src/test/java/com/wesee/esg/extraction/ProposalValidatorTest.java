package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProposalValidatorTest {

    private static final ExtractionContext CONTEXT = new ExtractionContext(
            List.of(new ExtractionContext.FactorOption("GRID_ELECTRICITY_MY", "Grid Electricity", "kWh")),
            List.of(new ExtractionContext.IndicatorOption("IND-ENG-01", "Total Electricity Consumed", "MWh")),
            2026);

    private static ProposedRecord proposal(ExtractionTargetType type, String targetId, String value, String unit) {
        return new ProposedRecord(type, targetId, new BigDecimal(value), unit, 2026, null,
                new BigDecimal("0.900"), "snippet");
    }

    @Test
    void keepsAProposalNamingAFactorThatExists() {
        var result = ProposalValidator.validate(
                List.of(proposal(ExtractionTargetType.EMISSION_ACTIVITY, "GRID_ELECTRICITY_MY", "1240", "kWh")),
                CONTEXT);

        assertEquals(1, result.size());
        assertEquals("GRID_ELECTRICITY_MY", result.get(0).resolvedTargetId());
        assertEquals(new BigDecimal("1240.0000"), result.get(0).convertedValue());
    }

    @Test
    void convertsIntoTheIndicatorsOwnUnit() {
        var result = ProposalValidator.validate(
                List.of(proposal(ExtractionTargetType.INDICATOR_VALUE, "IND-ENG-01", "1240", "kWh")),
                CONTEXT);

        assertEquals(1, result.size());
        assertEquals(new BigDecimal("1.2400"), result.get(0).convertedValue());
    }

    @Test
    void dropsAProposalNamingAFactorThatDoesNotExist() {
        var result = ProposalValidator.validate(
                List.of(proposal(ExtractionTargetType.EMISSION_ACTIVITY, "INVENTED_FACTOR", "1240", "kWh")),
                CONTEXT);

        assertTrue(result.isEmpty());
    }

    @Test
    void dropsOneBadProposalWithoutDiscardingTheGoodOnesBesideIt() {
        var result = ProposalValidator.validate(List.of(
                proposal(ExtractionTargetType.EMISSION_ACTIVITY, "INVENTED_FACTOR", "1", "kWh"),
                proposal(ExtractionTargetType.EMISSION_ACTIVITY, "GRID_ELECTRICITY_MY", "1240", "kWh")),
                CONTEXT);

        assertEquals(1, result.size());
        assertEquals("GRID_ELECTRICITY_MY", result.get(0).resolvedTargetId());
    }

    @Test
    void dropsAProposalWhoseUnitCannotReachTheTargetUnit() {
        var result = ProposalValidator.validate(
                List.of(proposal(ExtractionTargetType.INDICATOR_VALUE, "IND-ENG-01", "5", "tonnes")),
                CONTEXT);

        assertTrue(result.isEmpty());
    }

    @Test
    void dropsAProposalWithANullOrNegativeValue() {
        var negative = new ProposedRecord(ExtractionTargetType.EMISSION_ACTIVITY, "GRID_ELECTRICITY_MY",
                new BigDecimal("-5"), "kWh", 2026, null, new BigDecimal("0.9"), "snippet");

        assertTrue(ProposalValidator.validate(List.of(negative), CONTEXT).isEmpty());
    }
}
