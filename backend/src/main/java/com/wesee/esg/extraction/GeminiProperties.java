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
     * Fails rather than falling back. The fixed extractor proposes a plausible 1,240 kWh reading,
     * and a reviewer cannot tell an invented figure from a read one — accepting it would put a
     * number that was never on a document inside the assurance hash.
     */
    String requireApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "wesee.extraction.provider is gemini but no API key is set. Set GEMINI_API_KEY, "
                            + "or set EXTRACTION_PROVIDER=stub to run against the fixed extractor.");
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
}
