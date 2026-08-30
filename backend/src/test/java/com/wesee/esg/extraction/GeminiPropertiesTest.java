/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Starting without a key must stop the application rather than produce one that fails on first
 * upload. There is deliberately nothing to fall back to: a stand-in extractor's plausible figures
 * could be accepted into an assurance hash as though they had been read from a document, so the
 * e2e suite fakes the API over HTTP instead of shipping a fake extractor.
 */
class GeminiPropertiesTest {

    private static GeminiProperties withKey(String apiKey) {
        GeminiProperties properties = new GeminiProperties();
        properties.setApiKey(apiKey);
        return properties;
    }

    @Test
    void returnsTheKeyWhenOneIsConfigured() {
        assertEquals("a-real-key", withKey("a-real-key").requireApiKey());
    }

    /** Names both places a key can go, since there is no longer a stand-in to run without one. */
    @Test
    void refusesAMissingKeyAndSaysWhereToPutOne() {
        var thrown = assertThrows(IllegalStateException.class, () -> withKey(null).requireApiKey());

        assertTrue(thrown.getMessage().contains("GEMINI_API_KEY"), thrown.getMessage());
        assertTrue(thrown.getMessage().contains("application-local.properties"), thrown.getMessage());
    }

    /** An exported-but-empty variable is the common accident, and reads as absent. */
    @Test
    void treatsABlankKeyAsMissing() {
        assertThrows(IllegalStateException.class, () -> withKey("   ").requireApiKey());
    }

    @Test
    void carriesAModelDefaultSoOnlyTheKeyIsMandatory() {
        assertTrue(new GeminiProperties().getModel().startsWith("gemini-"));
    }

    /**
     * Unset by default, so nothing but an explicit override can send a tenant's documents anywhere
     * other than the real API. The e2e harness sets it to a local mock.
     */
    @Test
    void pointsAtTheRealApiUnlessABaseUrlIsGiven() {
        assertFalse(new GeminiProperties().hasBaseUrl());
    }

    @Test
    void usesABaseUrlOnceOneIsConfigured() {
        GeminiProperties properties = new GeminiProperties();
        properties.setBaseUrl("http://localhost:8099");

        assertTrue(properties.hasBaseUrl());
        assertEquals("http://localhost:8099", properties.getBaseUrl());
    }

    /** An empty override in a config file reads as absent rather than as an empty host. */
    @Test
    void treatsABlankBaseUrlAsUnset() {
        GeminiProperties properties = new GeminiProperties();
        properties.setBaseUrl("  ");

        assertFalse(properties.hasBaseUrl());
    }
}
