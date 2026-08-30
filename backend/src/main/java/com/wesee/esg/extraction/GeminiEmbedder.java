package com.wesee.esg.extraction;

import com.google.genai.Client;
import com.google.genai.types.EmbedContentConfig;
import com.google.genai.types.EmbedContentResponse;
import com.google.genai.types.HttpOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Turns text into a vector, using the same key and endpoint the extractor already uses.
 *
 * <p>Lives beside the extractor rather than with the evidence code that uses it: it needs the
 * same package-private GeminiProperties, and widening that class's surface to reach it from
 * elsewhere would be a change to working code for no gain.
 *
 * <p>Same bring-your-own-token arrangement: nothing new to configure, and a tenant's documents keep
 * going to exactly one provider rather than gaining a second one behind their back.
 */
@Component
public class GeminiEmbedder {

    private static final Logger log = LoggerFactory.getLogger(GeminiEmbedder.class);

    /**
     * The only embedding family this key can reach — text-embedding-004 answers 404 on v1beta.
     * Checked with ListModels rather than assumed: the name that appears in most examples is not
     * the one that is actually served.
     */
    static final String MODEL = "gemini-embedding-001";

    /**
     * It returns 3072 by default and takes a requested size. 768 is asked for explicitly so the
     * vector matches the vector(768) column in V78 — changing this needs a migration, not a
     * constant edit.
     */
    static final int DIMENSIONS = 768;

    private final Client client;

    GeminiEmbedder(GeminiProperties properties) {
        Client.Builder builder = Client.builder().apiKey(properties.requireApiKey());
        if (properties.hasBaseUrl()) {
            builder.httpOptions(HttpOptions.builder().baseUrl(properties.getBaseUrl()).build());
        }
        this.client = builder.build();
    }

    /**
     * @param taskType RETRIEVAL_DOCUMENT when indexing, RETRIEVAL_QUERY when searching. The two are
     *                 embedded differently by design, and using one for both quietly costs recall.
     */
    public float[] embed(String text, String taskType) {
        EmbedContentResponse response = client.models.embedContent(
                MODEL, text, EmbedContentConfig.builder().taskType(taskType).outputDimensionality(DIMENSIONS).build());

        return response.embeddings()
                .filter(list -> !list.isEmpty())
                .map(List::getFirst)
                .flatMap(e -> e.values())
                .map(values -> {
                    float[] out = new float[values.size()];
                    for (int i = 0; i < values.size(); i++) {
                        out[i] = values.get(i);
                    }
                    return out;
                })
                .orElseThrow(() -> new IllegalStateException("Embedding response carried no vector"));
    }

    public float[] forIndexing(String text) {
        return embed(text, "RETRIEVAL_DOCUMENT");
    }

    public float[] forQuery(String text) {
        return embed(text, "RETRIEVAL_QUERY");
    }
}
