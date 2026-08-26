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

    private static Schema property(String... path) {
        Schema at = ExtractionPromptFactory.schemaFor(CONTEXT);
        for (String name : path) {
            at = at.properties().orElseThrow().get(name);
        }
        return at;
    }

    @Test
    void asksForTheLabelledFieldsPrintedOutsideAnyTable() {
        Schema field = property("fields").items().orElseThrow();

        assertEquals(Type.Known.ARRAY, property("fields").type().orElseThrow().knownEnum());
        assertTrue(field.properties().orElseThrow().containsKey("label"));
        assertTrue(field.properties().orElseThrow().containsKey("value"));
    }

    /**
     * A Malaysian utility bill labels its line items in Malay — "Baki Terdahulu", "Jumlah Perlu
     * Dibayar". Glossing only the headings left the body of every table unreadable to someone who
     * does not read it, so the schema has to offer a gloss per cell as well.
     */
    @Test
    void asksForAnEnglishGlossOfEveryHeadingAndOfTheDescriptiveCells() {
        var table = property("tables").items().orElseThrow().properties().orElseThrow();
        assertTrue(table.containsKey("titleEnglish"));
        assertTrue(table.containsKey("columnsEnglish"));
        assertTrue(table.containsKey("rowsEnglish"), "a table needs a gloss per cell, not only per column");

        var field = property("fields").items().orElseThrow().properties().orElseThrow();
        assertTrue(field.containsKey("labelEnglish"));
        assertFalse(field.containsKey("valueEnglish"), "a value is a figure — translating one invents data");
    }

    /**
     * The instruction has to draw the line where the data starts, not where the table starts: a
     * line-item name is prose and translates, a figure or a meter number does not.
     */
    @Test
    void tellsTheModelToGlossProseButNeverFiguresOrIdentifiers() {
        String prompt = ExtractionPromptFactory.promptFor(CONTEXT);

        assertTrue(prompt.contains("rowsEnglish"));
        assertTrue(prompt.contains("Baki Terdahulu"), "the rule is anchored to a worked example");
        assertTrue(prompt.contains("figure, a date, a code"));
        assertFalse(prompt.contains("Never gloss a value or a cell"),
                "the old blanket rule also suppressed line-item descriptions");
    }

    /**
     * A bill is mostly tables. Asking only for label/value pairs would drop the rate beside a usage
     * figure and the unit beside a meter reading — and a kVARh row read as a kWh row is a
     * thousand-fold error waiting to happen.
     */
    @Test
    void asksForTablesWithTheirColumnsAndRows() {
        Schema table = property("tables").items().orElseThrow();
        var properties = table.properties().orElseThrow();

        assertTrue(properties.containsKey("title"));
        assertEquals(Type.Known.ARRAY, properties.get("columns").type().orElseThrow().knownEnum());

        Schema rows = properties.get("rows");
        assertEquals(Type.Known.ARRAY, rows.type().orElseThrow().knownEnum());
        // A row is itself a list of cells, so the item type has to be an array too.
        assertEquals(Type.Known.ARRAY, rows.items().orElseThrow().type().orElseThrow().knownEnum());
    }

    @Test
    void asksForEveryFieldAndTableOnThePage() {
        String prompt = ExtractionPromptFactory.promptFor(CONTEXT).toLowerCase();

        assertTrue(prompt.contains("transcribe"), prompt);
        assertTrue(prompt.contains("every table"), prompt);
    }

    /**
     * The transcription is what keeps "extract everything" from meaning "force everything into an
     * indicator": an amount payable belongs in the copy of the page, not in a MYR indicator.
     */
    @Test
    void saysTranscribedValuesAreNotProposals() {
        String prompt = ExtractionPromptFactory.promptFor(CONTEXT).toLowerCase();

        assertTrue(prompt.contains("do not convert") , prompt);
        assertTrue(prompt.contains("as printed") || prompt.contains("exactly as"), prompt);
    }

    /**
     * A TNB large-power bill prints peak and off-peak consumption and no total. Asked only for
     * "the figures", a model proposes the two components and no indicator at all — so the reading
     * lands in emission activity and the indicator it also belongs to stays empty.
     */
    @Test
    void asksForATotalWhenTheDocumentOnlyPrintsComponents() {
        String prompt = ExtractionPromptFactory.promptFor(CONTEXT).toLowerCase();

        assertTrue(prompt.contains("component"), prompt);
        assertTrue(prompt.contains("total"), prompt);
    }

    /** Everything on the page that has somewhere to go, not just the first line that matches. */
    @Test
    void asksForEveryFigureThatMatchesAnOption() {
        assertTrue(ExtractionPromptFactory.promptFor(CONTEXT).toLowerCase().contains("every figure"));
    }

    /**
     * The schema's enum cannot tell meaning from unit: an amount due in RM would validate against
     * a MYR indicator that means community investment. Only the prompt can refuse that.
     */
    @Test
    void tellsTheModelToMatchOnMeaningRatherThanOnUnit() {
        String prompt = ExtractionPromptFactory.promptFor(CONTEXT).toLowerCase();

        assertTrue(prompt.contains("same unit"), prompt);
        assertTrue(prompt.contains("leave it out") || prompt.contains("no option"), prompt);
    }
}
