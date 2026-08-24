package com.wesee.esg.extraction;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Reads an uploaded document with Gemini and proposes the records it implies.
 *
 * <p>Selected by {@code wesee.extraction.provider=gemini}, which is the default. Deliberately
 * without {@code matchIfMissing}: the test profile pins {@code stub}, so no suite can reach the
 * network by forgetting to override something.
 *
 * <p>Everything it returns is still untrusted. {@link ProposalValidator} resolves each proposal
 * against the tenant's own factors and indicators, and nothing reaches a real table until a person
 * accepts it.
 */
@Component
@ConditionalOnProperty(name = "wesee.extraction.provider", havingValue = "gemini", matchIfMissing = true)
public class GeminiDocumentExtractor implements DocumentExtractor {

    private static final Logger log = LoggerFactory.getLogger(GeminiDocumentExtractor.class);

    private final Client client;
    private final String model;

    GeminiDocumentExtractor(GeminiProperties properties) {
        // requireApiKey before anything else: a missing key should stop the application, not wait
        // to surface as a failed document on someone's first upload.
        this.client = Client.builder().apiKey(properties.requireApiKey()).build();
        this.model = properties.getModel();
    }

    @Override
    public ExtractionResult extract(byte[] content, String contentType, ExtractionContext context) {
        // Before the call, not after: the leading bytes already say whether this is readable, and
        // asking a third party to tell us costs a request and sends them a tenant's file.
        String mediaType = ExtractionMediaType.sniff(content);

        GenerateContentConfig config = GenerateContentConfig.builder()
                .responseMimeType("application/json")
                .responseSchema(ExtractionPromptFactory.schemaFor(context))
                // Reading a printed figure has one right answer; sampling variety would only make
                // the same bill extract differently on a retry.
                .temperature(0.0f)
                .build();

        String json;
        try {
            GenerateContentResponse response = client.models.generateContent(
                    model,
                    Content.fromParts(
                            Part.fromBytes(content, mediaType),
                            Part.fromText(ExtractionPromptFactory.promptFor(context))),
                    config);
            json = response.text();
        } catch (RuntimeException e) {
            // The document is left FAILED with this message, and the existing retry path covers a
            // transient outage without a re-upload.
            throw new ExtractionFailedException("Could not read the document: " + e.getMessage(), e);
        }

        if (json == null || json.isBlank()) {
            throw new ExtractionFailedException("The model returned nothing for this document");
        }

        List<ProposedRecord> records = ProposalJsonParser.parse(json);
        log.debug("Extracted {} proposal(s) from a {} with {}", records.size(), mediaType, model);
        return new ExtractionResult(model, records);
    }
}
