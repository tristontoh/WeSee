package com.wesee.esg.ai.provider;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/**
 * Calls Google's Gemini generateContent API directly — no SDK. Gemini's REST API supports
 * authenticating via either an {@code ?key=} query parameter or an {@code x-goog-api-key} header;
 * we deliberately use the header so the key is never part of the request URI — Spring's
 * {@link RestClientException} messages commonly embed the full URI, and a query-param key would
 * risk leaking into an error response.
 */
@Service
public class GeminiClient implements AiProviderClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private static final String API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    private final RestClient restClient;

    public GeminiClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(60_000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public AiCompletionResult complete(String apiKey, String model, String systemPrompt, String userPrompt) {
        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(Map.of("parts", List.of(Map.of("text", userPrompt))))
        );

        try {
            Map<String, Object> response = restClient.post()
                    .uri(String.format(API_URL_TEMPLATE, model))
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null) {
                throw new AiProviderException("Gemini returned an empty response");
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            String text = "";
            if (candidates != null && !candidates.isEmpty()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                if (content != null) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    text = parts != null && !parts.isEmpty() ? String.valueOf(parts.get(0).get("text")) : "";
                }
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> usage = (Map<String, Object>) response.get("usageMetadata");
            int inputTokens = usage != null ? ((Number) usage.getOrDefault("promptTokenCount", 0)).intValue() : 0;
            int outputTokens = usage != null ? ((Number) usage.getOrDefault("candidatesTokenCount", 0)).intValue() : 0;

            return new AiCompletionResult(text, inputTokens, outputTokens);
        } catch (RestClientException e) {
            // Deliberately never propagate e.getMessage() to the client — Spring's exception
            // messages commonly embed the full request URI/body, and this is the one provider
            // client most likely to be copy-pasted with a query-param key in a future edit, so
            // keep the "never surface raw exception detail" habit here even with header auth.
            String status = e instanceof HttpStatusCodeException httpEx ? " (HTTP " + httpEx.getStatusCode().value() + ")" : "";
            log.warn("Gemini request failed{}: {}", status, e.getClass().getSimpleName());
            throw new AiProviderException("Gemini request failed" + status + " — check that your API key and model name are correct", e);
        }
    }
}
