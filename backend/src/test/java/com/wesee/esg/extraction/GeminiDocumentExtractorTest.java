/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Covers what can be established without reaching a model: that the bean refuses to exist without a
 * key, and that an unreadable file is turned away before anything is sent anywhere. The call itself
 * is verified by hand against a real bill.
 */
class GeminiDocumentExtractorTest {

    private static final ExtractionContext CONTEXT = new ExtractionContext(
            List.of(new ExtractionContext.FactorOption("GRID_ELECTRICITY_MY", "Grid Electricity", "kWh")),
            List.of(new ExtractionContext.IndicatorOption("IND-ENG-01", "Total Electricity Consumed", "MWh")),
            2026);

    private static GeminiProperties properties(String apiKey) {
        GeminiProperties properties = new GeminiProperties();
        properties.setApiKey(apiKey);
        return properties;
    }

    /** Startup, not first upload: a backend that cannot extract should say so before serving. */
    @Test
    void refusesToBeConstructedWithoutAnApiKey() {
        var thrown = assertThrows(IllegalStateException.class,
                () -> new GeminiDocumentExtractor(properties(null)));

        assertTrue(thrown.getMessage().contains("GEMINI_API_KEY"), thrown.getMessage());
    }

    /**
     * The e2e harness runs the real extractor against a local mock, so a configured base url has to
     * reach the client rather than being quietly ignored.
     */
    @Test
    void acceptsABaseUrlPointingSomewhereOtherThanTheRealApi() {
        GeminiProperties properties = properties("e2e-not-a-real-key");
        properties.setBaseUrl("http://localhost:8099");

        assertDoesNotThrow(() -> new GeminiDocumentExtractor(properties));
    }

    /**
     * A spreadsheet must be turned away locally. Reaching the model first would spend a call and
     * send a tenant's file to a third party to learn what its first four bytes already said.
     */
    @Test
    void refusesAnUnreadableFileWithoutCallingTheModel() {
        var extractor = new GeminiDocumentExtractor(properties("fake-key-never-used"));
        byte[] xlsx = {0x50, 0x4B, 0x03, 0x04, 0x14, 0x00};

        assertThrows(ExtractionFailedException.class, () -> extractor.extract(xlsx, null, CONTEXT));
    }
}
