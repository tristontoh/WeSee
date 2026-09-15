/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.verification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wesee.esg.extraction.GeminiProperties;
import com.wesee.esg.tenant.CompanyNameMatcher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Sends one real document to the real model. Skipped unless both GEMINI_API_KEY and
 * IDENTITY_DOC_PATH are set, so an ordinary {@code mvn test} never spends a request or needs a key.
 *
 * <pre>
 *   GEMINI_API_KEY=... IDENTITY_DOC_PATH=/path/to/bill.pdf \
 *     mvn test -Dtest=IdentityDocumentReaderLiveTest
 * </pre>
 *
 * <p>No document is committed with it. A real bill is a tenant's document, and a synthetic one that
 * lived in the repository would drift away from what the model actually receives.
 *
 * <p>What this pins down, and unit tests cannot: that the reader returns the name <em>printed on
 * the page</em> rather than a plausible-sounding one, and that it leaves the SSM number empty on a
 * utility bill instead of offering the account number in its place.
 */
@EnabledIfEnvironmentVariable(named = "GEMINI_API_KEY", matches = ".+")
@EnabledIfEnvironmentVariable(named = "IDENTITY_DOC_PATH", matches = ".+")
class IdentityDocumentReaderLiveTest {

    private IdentityDocumentReader reader() {
        GeminiProperties properties = new GeminiProperties();
        properties.setApiKey(System.getenv("GEMINI_API_KEY"));
        String model = System.getenv("GEMINI_MODEL");
        properties.setModel(model != null && !model.isBlank() ? model : "gemini-3.7-flash");
        return new IdentityDocumentReader(properties, new ObjectMapper());
    }

    @Test
    void readsTheNamePrintedOnTheDocument() throws Exception {
        byte[] content = Files.readAllBytes(Path.of(System.getenv("IDENTITY_DOC_PATH")));

        IdentityDocumentReader.IdentityDocument doc = reader().read(content, null);

        System.out.println("  companyName        = " + doc.companyName());
        System.out.println("  registrationNumber = " + doc.registrationNumber());
        System.out.println("  documentType       = " + doc.documentType());
        System.out.println("  documentDate       = " + doc.documentDate());
        System.out.println("  answeredBy         = " + doc.answeredBy());

        assertThat(doc.companyName()).isNotBlank();

        String expected = System.getenv("IDENTITY_DOC_EXPECTED_NAME");
        if (expected != null && !expected.isBlank()) {
            CompanyNameMatcher.Result result = CompanyNameMatcher.compare(expected, doc.companyName());
            System.out.println("  match vs \"" + expected + "\" = " + result.verdict()
                    + " (similarity " + String.format("%.3f", result.similarity()) + ")");
            assertThat(result.matched())
                    .as("the name read off the document should match the company that claimed it")
                    .isTrue();
        }
    }
}
