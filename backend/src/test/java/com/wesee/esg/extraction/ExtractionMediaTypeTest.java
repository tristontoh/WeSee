package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The worker calls {@code extract(content, null, context)} — the content type is always null, so
 * what a document actually is has to come from its own leading bytes rather than from a label.
 */
class ExtractionMediaTypeTest {

    private static byte[] bytes(int... values) {
        byte[] out = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            out[i] = (byte) values[i];
        }
        return out;
    }

    @Test
    void readsAPdfFromItsHeader() {
        byte[] pdf = "%PDF-1.4\nelectricity bill\n".getBytes(StandardCharsets.US_ASCII);

        assertEquals("application/pdf", ExtractionMediaType.sniff(pdf));
    }

    @Test
    void readsAPngFromItsHeader() {
        assertEquals("image/png", ExtractionMediaType.sniff(bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00)));
    }

    @Test
    void readsAJpegFromItsHeader() {
        assertEquals("image/jpeg", ExtractionMediaType.sniff(bytes(0xFF, 0xD8, 0xFF, 0xE0, 0x00)));
    }

    /**
     * xlsx and docx are both zip archives, so neither can be named from its bytes alone — the
     * message has to say what extraction can read instead of what it was handed.
     */
    @Test
    void refusesAZipArchiveAndSaysWhatItCanRead() {
        byte[] xlsx = bytes(0x50, 0x4B, 0x03, 0x04, 0x14, 0x00);

        var thrown = assertThrows(ExtractionFailedException.class, () -> ExtractionMediaType.sniff(xlsx));

        assertTrue(thrown.getMessage().contains("PDF"), thrown.getMessage());
        assertTrue(thrown.getMessage().contains("JPEG"), thrown.getMessage());
    }

    @Test
    void refusesPlainTextSuchAsACsv() {
        byte[] csv = "month,kWh\n2026-01,1240\n".getBytes(StandardCharsets.US_ASCII);

        assertThrows(ExtractionFailedException.class, () -> ExtractionMediaType.sniff(csv));
    }

    /** A truncated upload must not index past the end of the array while sniffing. */
    @Test
    void refusesContentTooShortToCarryAnySignature() {
        assertThrows(ExtractionFailedException.class, () -> ExtractionMediaType.sniff(bytes(0x25, 0x50)));
    }

    @Test
    void refusesEmptyContent() {
        assertThrows(ExtractionFailedException.class, () -> ExtractionMediaType.sniff(new byte[0]));
    }
}
