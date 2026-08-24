package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Selecting the Gemini extractor without a key must stop the application rather than start one that
 * fails on first upload — and must never quietly fall back to the fixed extractor, whose plausible
 * figures could be accepted into an assurance hash as though they had been read from a document.
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

    @Test
    void refusesAMissingKeyAndNamesBothWaysOut() {
        var thrown = assertThrows(IllegalStateException.class, () -> withKey(null).requireApiKey());

        assertTrue(thrown.getMessage().contains("GEMINI_API_KEY"), thrown.getMessage());
        assertTrue(thrown.getMessage().contains("stub"), thrown.getMessage());
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
}
