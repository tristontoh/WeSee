package com.wesee.esg.extraction;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

/**
 * Turns a model's JSON reply into proposals. Every field is still untrusted afterwards — this only
 * establishes that the reply was JSON of the requested shape, and {@link ProposalValidator}
 * decides whether what it names actually exists.
 */
final class ProposalJsonParser {

    /**
     * {@code USE_BIG_DECIMAL_FOR_FLOATS} rather than the default binary float: these values become
     * tCO2e figures, and a rounding error introduced here would be invisible in the review queue.
     * Unknown properties are tolerated because a model adding a field it was not asked for is not a
     * reason to fail a document.
     */
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

    private record Response(List<ProposedRecord> records,
                            List<DocumentTranscription.Field> fields,
                            List<DocumentTranscription.Table> tables) {
    }

    private ProposalJsonParser() {
    }

    static List<ProposedRecord> parse(String json) {
        Response response = read(json);
        // Absent rather than empty: valid JSON that omits the array read nothing, which is an
        // outcome, not a failure.
        return response.records() != null ? response.records() : List.of();
    }

    /** Both halves of one reply, so a full-page transcription is not deserialised twice. */
    record Parsed(List<ProposedRecord> records, DocumentTranscription transcription) {
    }

    /**
     * One pass for both. The two used to be read separately on the grounds that the string was
     * small; a transcribed multi-meter bill carries every field and every cell, so it is not, and
     * a malformed reply used to be parsed once before the second call threw on it anyway.
     */
    static Parsed parseAll(String json) {
        Response response = read(json);
        return new Parsed(
                response.records() != null ? response.records() : List.of(),
                new DocumentTranscription(response.fields(), response.tables()));
    }

    /**
     * The copy of the page that travels with the proposals. Kept alongside {@link #parseAll} for
     * callers that want only this half.
     */
    static DocumentTranscription parseTranscription(String json) {
        Response response = read(json);
        return new DocumentTranscription(response.fields(), response.tables());
    }

    private static Response read(String json) {
        try {
            return MAPPER.readValue(json, Response.class);
        } catch (JsonProcessingException e) {
            throw new ExtractionFailedException("The model's reply was not usable JSON", e);
        }
    }
}
