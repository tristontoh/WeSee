package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The stored file is served back for preview, so the type has to be right: a PDF labelled
 * octet-stream is offered as a download instead of rendering, which is the whole point of the
 * detail screen. {@code URLConnection.guessContentTypeFromName} returns null often enough that
 * relying on it directly would do exactly that.
 */
class DocumentContentTypeTest {

    @Test
    void namesTheThreeTypesThatCanBePreviewed() {
        assertEquals("application/pdf", DocumentContentType.forFileName("bill.pdf").toString());
        assertEquals("image/png", DocumentContentType.forFileName("meter.png").toString());
        assertEquals("image/jpeg", DocumentContentType.forFileName("meter.jpg").toString());
        assertEquals("image/jpeg", DocumentContentType.forFileName("meter.jpeg").toString());
    }

    /** Phone cameras and Windows both produce upper-case extensions. */
    @Test
    void ignoresTheCaseOfTheExtension() {
        assertEquals("application/pdf", DocumentContentType.forFileName("BILL.PDF").toString());
        assertEquals("image/jpeg", DocumentContentType.forFileName("IMG_0421.JPG").toString());
    }

    @Test
    void namesTheSpreadsheetAndDocumentTypesTheAllowlistAccepts() {
        assertEquals("text/csv", DocumentContentType.forFileName("readings.csv").toString());
        assertEquals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                DocumentContentType.forFileName("readings.xlsx").toString());
        assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                DocumentContentType.forFileName("notes.docx").toString());
    }

    @Test
    void fallsBackToOctetStreamRatherThanReturningNothing() {
        assertEquals("application/octet-stream", DocumentContentType.forFileName("mystery.xyz").toString());
        assertEquals("application/octet-stream", DocumentContentType.forFileName("no-extension").toString());
    }

    /** A name ending in a dot has an empty extension, which must not index out of bounds. */
    @Test
    void survivesANameThatEndsInADot() {
        assertEquals("application/octet-stream", DocumentContentType.forFileName("trailing.").toString());
    }
}
