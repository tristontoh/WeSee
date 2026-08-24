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
