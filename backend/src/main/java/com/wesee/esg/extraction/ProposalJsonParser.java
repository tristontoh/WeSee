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

    /**
     * The copy of the page that travels with the proposals. A second pass over the same small
     * string rather than one method returning both: the two are consumed at different points and
     * keeping the signatures separate is worth more than the parse.
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
