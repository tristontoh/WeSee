package com.wesee.esg.extraction;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "wesee.extraction.gemini")
public class GeminiProperties {

    private String apiKey;

    /**
     * Configurable rather than fixed: model names turn over faster than this code will, and the
     * current default is on introductory pricing that ends 2027-01-01.
     */
    private String model = "gemini-3.7-flash";

    /**
     * Where the client sends requests. Unset in every real configuration — only the e2e harness
     * overrides it, pointing at a local mock so the suite can exercise the whole review path
     * without a network call, a key, or a per-run cost.
     */
    private String baseUrl;

    /**
     * Fails at startup rather than on someone's first upload. There is nothing to fall back to by
     * design: a stand-in that invented figures would put numbers that were never on a document
     * inside the assurance hash, and a reviewer could not tell which was which.
     */
    String requireApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "Document extraction needs a Gemini API key. Set GEMINI_API_KEY, or put "
                            + "wesee.extraction.gemini.api-key in application-local.properties.");
        }
        return apiKey;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    boolean hasBaseUrl() {
        return baseUrl != null && !baseUrl.isBlank();
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }
}
