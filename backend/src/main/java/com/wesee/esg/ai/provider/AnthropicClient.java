package com.wesee.esg.ai.provider;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/** Calls Anthropic's Messages API (https://api.anthropic.com/v1/messages) directly — no SDK. */
@Service
public class AnthropicClient implements AiProviderClient {

    private static final Logger log = LoggerFactory.getLogger(AnthropicClient.class);

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final int MAX_TOKENS = 1536;

    private final RestClient restClient;

    public AnthropicClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(60_000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public AiCompletionResult complete(String apiKey, String model, String systemPrompt, String userPrompt) {
        Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", MAX_TOKENS,
                "system", systemPrompt,
                "messages", List.of(Map.of("role", "user", "content", userPrompt))
        );

        try {
            Map<String, Object> response = restClient.post()
                    .uri(API_URL)
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null) {
                throw new AiProviderException("Anthropic returned an empty response");
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
            // A first block that is thinking or tool_use carries no "text"; String.valueOf would
            // put the four characters "null" into the user's disclosure.
            String text = content == null || content.isEmpty() ? "" : textOrEmpty(content.get(0).get("text"));

            @SuppressWarnings("unchecked")
            Map<String, Object> usage = (Map<String, Object>) response.get("usage");
            int inputTokens = usage != null ? ((Number) usage.getOrDefault("input_tokens", 0)).intValue() : 0;
            int outputTokens = usage != null ? ((Number) usage.getOrDefault("output_tokens", 0)).intValue() : 0;

            return new AiCompletionResult(text, inputTokens, outputTokens);
        } catch (RestClientException e) {
            // Never the provider's own message: Spring embeds the request URI and body in it, and
            // this string reaches the browser and is persisted into ai_usage_log. Same rule
            // GeminiClient states explicitly.
            String status = e instanceof HttpStatusCodeException httpEx ? " (HTTP " + httpEx.getStatusCode().value() + ")" : "";
            log.warn("Anthropic request failed{}: {}", status, e.getClass().getSimpleName());
            throw new AiProviderException("Anthropic request failed" + status + " — check that your API key and model name are correct", e);
        }
    }

    private static String safeMessage(Exception e) {
        String message = e.getMessage();
        return message == null ? "unknown error" : message;
    }

    /** A JSON field that is absent or null is no text at all, never the string "null". */
    private static String textOrEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

}
