package com.wesee.esg.extraction;

import com.google.genai.types.Schema;
import com.google.genai.types.Type;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExtractionPromptFactoryTest {

    private static final ExtractionContext CONTEXT = new ExtractionContext(
            List.of(new ExtractionContext.FactorOption("GRID_ELECTRICITY_MY", "Grid Electricity (Peninsular Malaysia)", "kWh"),
                    new ExtractionContext.FactorOption("DIESEL_MY", "Diesel", "litre")),
            List.of(new ExtractionContext.IndicatorOption("IND-ENG-01", "Total Electricity Consumed", "MWh")),
            2026);

    private static Schema recordProperty(String name) {
        return ExtractionPromptFactory.schemaFor(CONTEXT)
                .properties().orElseThrow().get("records")
                .items().orElseThrow()
                .properties().orElseThrow().get(name);
    }

    /**
     * The point of the schema: a model cannot name a factor this tenant does not have, because the
     * only strings the field accepts are the ones its own closed set contains. ProposalValidator
     * still checks — this makes it the second line rather than the only one.
     */
    @Test
    void pinsTargetIdToExactlyTheTenantsOwnIds() {
        Set<String> allowed = Set.copyOf(recordProperty("targetId").enum_().orElseThrow());

        assertEquals(Set.of("GRID_ELECTRICITY_MY", "DIESEL_MY", "IND-ENG-01"), allowed);
    }

    @Test
    void pinsTargetTypeToTheTwoDestinations() {
        Set<String> allowed = Set.copyOf(recordProperty("targetType").enum_().orElseThrow());

        assertEquals(Set.of("EMISSION_ACTIVITY", "INDICATOR_VALUE"), allowed);
    }

    @Test
    void asksForAnArrayOfRecordsAtTheTop() {
        Schema schema = ExtractionPromptFactory.schemaFor(CONTEXT);

        assertEquals(Type.Known.OBJECT, schema.type().orElseThrow().knownEnum());
        assertEquals(Type.Known.ARRAY,
                schema.properties().orElseThrow().get("records").type().orElseThrow().knownEnum());
    }

    /** A bill covering a whole year names no month, so requiring one would force an invention. */
    @Test
    void leavesMonthOptionalWhileRequiringTheFieldsEveryReadingNeeds() {
        Schema record = ExtractionPromptFactory.schemaFor(CONTEXT)
                .properties().orElseThrow().get("records").items().orElseThrow();
        List<String> required = record.required().orElseThrow();

        assertTrue(required.containsAll(
                List.of("targetType", "targetId", "value", "unitAsRead", "fiscalYear", "sourceSnippet")));
        assertFalse(required.contains("month"));
    }

    @Test
    void listsEveryFactorAndIndicatorWithItsOwnUnit() {
        String prompt = ExtractionPromptFactory.promptFor(CONTEXT);

        assertTrue(prompt.contains("GRID_ELECTRICITY_MY"), prompt);
        assertTrue(prompt.contains("Grid Electricity (Peninsular Malaysia)"), prompt);
        assertTrue(prompt.contains("kWh"), prompt);
        assertTrue(prompt.contains("DIESEL_MY"), prompt);
        assertTrue(prompt.contains("IND-ENG-01"), prompt);
        assertTrue(prompt.contains("MWh"), prompt);
    }

    @Test
    void namesTheFiscalYearToFallBackOn() {
        assertTrue(ExtractionPromptFactory.promptFor(CONTEXT).contains("2026"));
    }

    /**
     * UnitConverter owns kWh to MWh. A model that converts as well would have its work applied
     * twice — a value wrong by a factor of a thousand while still looking plausible.
     */
    @Test
    void tellsTheModelNotToConvertUnitsItself() {
        String prompt = ExtractionPromptFactory.promptFor(CONTEXT).toLowerCase();

        assertTrue(prompt.contains("do not convert"), prompt);
    }

    /** The snippet is the only thing a reviewer can check the number against. */
    @Test
    void asksForTheSourceTextVerbatim() {
        assertTrue(ExtractionPromptFactory.promptFor(CONTEXT).toLowerCase().contains("verbatim"));
    }
}
