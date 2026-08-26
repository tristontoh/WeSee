package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProposalJsonParserTest {

    @Test
    void readsBothRecordsAOneBillResponseCarries() {
        String json = """
                {"records": [
                  {"targetType": "EMISSION_ACTIVITY", "targetId": "GRID_ELECTRICITY_MY",
                   "value": 1240, "unitAsRead": "kWh", "fiscalYear": 2026, "month": 1,
                   "confidence": 0.9, "sourceSnippet": "Total consumption: 1,240 kWh"},
                  {"targetType": "INDICATOR_VALUE", "targetId": "IND-ENG-01",
                   "value": 1240, "unitAsRead": "kWh", "fiscalYear": 2026, "month": 1,
                   "confidence": 0.9, "sourceSnippet": "Total consumption: 1,240 kWh"}
                ]}""";

        List<ProposedRecord> records = ProposalJsonParser.parse(json);

        assertEquals(2, records.size());
        assertEquals(ExtractionTargetType.EMISSION_ACTIVITY, records.get(0).targetType());
        assertEquals("GRID_ELECTRICITY_MY", records.get(0).targetId());
        assertEquals(ExtractionTargetType.INDICATOR_VALUE, records.get(1).targetType());
        assertEquals("Total consumption: 1,240 kWh", records.get(0).sourceSnippet());
    }

    /**
     * A tCO2e figure derived through a double is wrong in a way nobody notices, so the value has to
     * survive parsing exactly rather than as the nearest binary float.
     */
    @Test
    void keepsADecimalValueExact() {
        String json = """
                {"records": [{"targetType": "EMISSION_ACTIVITY", "targetId": "F", "value": 1240.55,
                 "unitAsRead": "kWh", "fiscalYear": 2026, "confidence": 0.9, "sourceSnippet": "s"}]}""";

        BigDecimal value = ProposalJsonParser.parse(json).get(0).value();

        assertEquals(new BigDecimal("1240.55"), value);
    }

    /** A bill covering a whole year names no month, and that is not an error. */
    @Test
    void leavesMonthNullWhenTheDocumentNamesNone() {
        String json = """
                {"records": [{"targetType": "INDICATOR_VALUE", "targetId": "I", "value": 12,
                 "unitAsRead": "MWh", "fiscalYear": 2026, "confidence": 0.8, "sourceSnippet": "s"}]}""";

        assertNull(ProposalJsonParser.parse(json).get(0).month());
    }

    /**
     * Reading a document and finding nothing in it is a real outcome, distinct from failing to read
     * it — {@link ExtractionFailedException} is only for the latter.
     */
    @Test
    void returnsEmptyWhenTheModelFoundNothingToPropose() {
        assertTrue(ProposalJsonParser.parse("{\"records\": []}").isEmpty());
    }

    @Test
    void toleratesAFieldTheSchemaDidNotAskFor() {
        String json = """
                {"records": [{"targetType": "INDICATOR_VALUE", "targetId": "I", "value": 12,
                 "unitAsRead": "MWh", "fiscalYear": 2026, "confidence": 0.8, "sourceSnippet": "s",
                 "reasoning": "chatter the schema never requested"}]}""";

        assertEquals(1, ProposalJsonParser.parse(json).size());
    }

    /** Valid JSON that simply omits the array must read as "found nothing", not throw. */
    @Test
    void treatsAMissingRecordsArrayAsFindingNothing() {
        assertTrue(ProposalJsonParser.parse("{}").isEmpty());
    }

    @Test
    void transcribesTheLabelledFieldsPrintedOutsideAnyTable() {
        String json = """
                {"records": [], "fields": [
                  {"label": "No. Akaun", "value": "220487651234"},
                  {"label": "Tempoh Bil", "value": "02.05.2025 - 01.06.2025"}
                ]}""";

        var fields = ProposalJsonParser.parseTranscription(json).fields();

        assertEquals(2, fields.size());
        assertEquals("No. Akaun", fields.get(0).label());
        assertEquals("220487651234", fields.get(0).value());
    }

    /**
     * A meter table is the reason tables are transcribed rather than flattened: the unit lives in
     * its own column, and kVARh in one row beside kWh in another is a distinction a reviewer needs.
     */
    @Test
    void transcribesATableWithItsColumnsAndEveryRow() {
        String json = """
                {"records": [], "tables": [
                  {"title": "Maklumat Meter",
                   "columns": ["No. Meter", "Penggunaan", "Unit"],
                   "rows": [["M 825603417", "612,340.00", "kWh P"],
                            ["M 825603417", "267,840.00", "kVARh"],
                            ["TENANT", "42,180.00", "kWh"]]}
                ]}""";

        var tables = ProposalJsonParser.parseTranscription(json).tables();

        assertEquals(1, tables.size());
        assertEquals("Maklumat Meter", tables.get(0).title());
        assertEquals(List.of("No. Meter", "Penggunaan", "Unit"), tables.get(0).columns());
        assertEquals(3, tables.get(0).rows().size());
        assertEquals(List.of("TENANT", "42,180.00", "kWh"), tables.get(0).rows().get(2));
    }

    /** A document with no transcribable structure reads as empty, not as null. */
    @Test
    void treatsAResponseWithoutFieldsOrTablesAsAnEmptyTranscription() {
        var transcription = ProposalJsonParser.parseTranscription("{\"records\": []}");

        assertTrue(transcription.isEmpty());
        assertTrue(transcription.fields().isEmpty());
        assertTrue(transcription.tables().isEmpty());
    }

    /** Bills merge cells and leave them blank; a short row must not lose the rest of the table. */
    @Test
    void keepsARaggedRowRatherThanDiscardingTheTable() {
        String json = """
                {"records": [], "tables": [
                  {"title": "Caj", "columns": ["Penerangan", "Tanpa ST", "Jumlah"],
                   "rows": [["Caj Semasa", "272,045.16", "276,397.88"], ["Kumpulan Wang Tenaga"]]}
                ]}""";

        var rows = ProposalJsonParser.parseTranscription(json).tables().get(0).rows();

        assertEquals(2, rows.size());
        assertEquals(1, rows.get(1).size());
    }

    @Test
    void failsOnAResponseThatIsNotJson() {
        assertThrows(ExtractionFailedException.class,
                () -> ProposalJsonParser.parse("I'm sorry, I can't read this bill."));
    }

    @Test
    void failsOnATargetTypeThatIsNotOneOfOurs() {
        String json = """
                {"records": [{"targetType": "SOMETHING_ELSE", "targetId": "I", "value": 12,
                 "unitAsRead": "MWh", "fiscalYear": 2026, "confidence": 0.8, "sourceSnippet": "s"}]}""";

        assertThrows(ExtractionFailedException.class, () -> ProposalJsonParser.parse(json));
    }
}
