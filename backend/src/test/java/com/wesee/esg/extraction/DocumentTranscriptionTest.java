package com.wesee.esg.extraction;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Hibernate stores this as jsonb and reads it back with Jackson, so it has to survive a round trip.
 * A getter-shaped helper is the trap: {@code isEmpty()} reads as a property, gets written into the
 * column, and then fails to deserialize because no constructor parameter matches it.
 */
class DocumentTranscriptionTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static DocumentTranscription sample() {
        return new DocumentTranscription(
                List.of(new DocumentTranscription.Field("No. Akaun", "Account number", "220487651234")),
                List.of(new DocumentTranscription.Table("Maklumat Meter", "Meter information",
                        List.of("No. Meter", "Penggunaan", "Unit"),
                        List.of("Meter number", "Usage", "Unit"),
                        List.of(List.of("M 825603417", "612,340.00", "kWh P"),
                                List.of("TENANT", "42,180.00", "kWh")),
                        // A gloss for the descriptive cell only; the figures carry none.
                        Arrays.asList(Arrays.asList(null, null, null),
                                Arrays.asList("TENANT", null, null)))));
    }

    @Test
    void survivesTheRoundTripHibernatePutsItThrough() throws Exception {
        String json = MAPPER.writeValueAsString(sample());

        DocumentTranscription read = MAPPER.readValue(json, DocumentTranscription.class);

        assertEquals(sample(), read);
    }

    /** No helper may leak into the stored json, or reading an older row breaks on an unknown key. */
    @Test
    void writesOnlyTheTwoPropertiesItIsMadeOf() throws Exception {
        var written = MAPPER.readTree(MAPPER.writeValueAsString(sample()));

        assertEquals(2, written.size(), written.toString());
        assertTrue(written.has("fields"));
        assertTrue(written.has("tables"));
    }

    @Test
    void readsAbsentArraysAsEmptyRatherThanNull() throws Exception {
        DocumentTranscription read = MAPPER.readValue("{}", DocumentTranscription.class);

        assertTrue(read.isEmpty());
        assertTrue(read.fields().isEmpty());
        assertTrue(read.tables().isEmpty());
    }

    @Test
    void isNotEmptyOnceItHasAnything() {
        assertFalse(sample().isEmpty());
    }

    /**
     * A row transcribed before glossing existed has no "...English" keys at all, and one whose text
     * was already English has none either. Both have to read back rather than throw.
     */
    @Test
    void readsARowThatCarriesNoGlossAtAll() throws Exception {
        String json = """
                {"fields":[{"label":"Invoice No","value":"INV-1"}],
                 "tables":[{"columns":["Description","Amount"],"rows":[["Charge","10.00"]]}]}
                """;

        DocumentTranscription read = MAPPER.readValue(json, DocumentTranscription.class);

        assertNull(read.fields().get(0).labelEnglish());
        assertNull(read.tables().get(0).titleEnglish());
        assertTrue(read.tables().get(0).columnsEnglish().isEmpty());
    }

    /**
     * rowsEnglish is positional and the model may return it shorter than rows, ragged, or not at
     * all — every one of which has to read as "this cell has no gloss" rather than throw.
     */
    @Test
    void cellGlossLookupToleratesAShortOrRaggedList() {
        var table = new DocumentTranscription.Table("t", null,
                List.of("Keterangan", "Amaun"),
                List.of("Description", "Amount"),
                List.of(List.of("Baki Terdahulu", "38.40"), List.of("Jumlah", "57.85")),
                Arrays.asList(Arrays.asList("Previous balance", null)));

        assertEquals("Previous balance", table.cellEnglish(0, 0));
        assertNull(table.cellEnglish(0, 1), "a figure carries no gloss");
        assertNull(table.cellEnglish(0, 5), "past the end of the row");
        assertNull(table.cellEnglish(1, 0), "past the end of rowsEnglish");
    }

    /** A blank gloss is the schema's way of saying "not translatable", so it must read as absent. */
    @Test
    void aBlankCellGlossReadsAsNone() {
        var table = new DocumentTranscription.Table("t", null,
                List.of("Keterangan"), List.of("Description"),
                List.of(List.of("38.40")),
                List.of(List.of("   ")));

        assertNull(table.cellEnglish(0, 0));
    }

    /** columnsEnglish is positional and may be shorter than columns, so the lookup must not throw. */
    @Test
    void columnGlossLookupToleratesAShortList() {
        var table = new DocumentTranscription.Table("t", null,
                List.of("No. Meter", "Penggunaan", "Unit"),
                List.of("Meter number"),
                List.of(), List.of());

        assertEquals("Meter number", table.columnEnglish(0));
        assertNull(table.columnEnglish(1));
        assertNull(table.columnEnglish(2));
    }
}
