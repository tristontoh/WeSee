package com.wesee.esg.extraction;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.Part;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Reads an uploaded document with Gemini and proposes the records it implies. The only
 * implementation — there is no fixed-reading stand-in to fall back to, so a misconfiguration
 * surfaces as a failure rather than as invented figures.
 *
 * <p>Everything it returns is still untrusted. {@link ProposalValidator} resolves each proposal
 * against the tenant's own factors and indicators, and nothing reaches a real table until a person
 * accepts it.
 */
@Component
public class GeminiDocumentExtractor implements DocumentExtractor {

    private static final Logger log = LoggerFactory.getLogger(GeminiDocumentExtractor.class);

    private final Client client;
    private final String model;

    GeminiDocumentExtractor(GeminiProperties properties) {
        // requireApiKey before anything else: a missing key should stop the application, not wait
        // to surface as a failed document on someone's first upload.
        Client.Builder builder = Client.builder().apiKey(properties.requireApiKey());

        // Only the e2e harness sets this, pointing at a local mock. Logged at warn because a
        // deployment that reached here by accident would be sending documents to the wrong place.
        if (properties.hasBaseUrl()) {
            log.warn("Gemini base url overridden to {} — not the real API", properties.getBaseUrl());
            builder.httpOptions(HttpOptions.builder().baseUrl(properties.getBaseUrl()).build());
        }

        this.client = builder.build();
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
        String answeredBy;
        try {
            GenerateContentResponse response = client.models.generateContent(
                    model,
                    Content.fromParts(
                            Part.fromBytes(content, mediaType),
                            Part.fromText(ExtractionPromptFactory.promptFor(context))),
                    config);
            json = response.text();
            // What actually answered, not what was asked for. The two differ whenever the base url
            // is overridden, and provenance that names the configured model regardless would let a
            // stand-in's figures look as though a real model had read them.
            answeredBy = response.modelVersion().orElse(model);
        } catch (RuntimeException e) {
            // The document is left FAILED with this message, and the existing retry path covers a
            // transient outage without a re-upload.
            throw new ExtractionFailedException("Could not read the document: " + e.getMessage(), e);
        }

        if (json == null || json.isBlank()) {
            throw new ExtractionFailedException("The model returned nothing for this document");
        }

        List<ProposedRecord> records = ProposalJsonParser.parse(json);
        log.debug("Extracted {} proposal(s) from a {} with {}", records.size(), mediaType, answeredBy);
        return new ExtractionResult(answeredBy, records);
    }
}
