package com.wesee.esg.ai.provider;

import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/** Calls Anthropic's Messages API (https://api.anthropic.com/v1/messages) directly — no SDK. */
@Service
public class AnthropicClient implements AiProviderClient {

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
            String text = content == null || content.isEmpty() ? "" : String.valueOf(content.get(0).get("text"));

            @SuppressWarnings("unchecked")
            Map<String, Object> usage = (Map<String, Object>) response.get("usage");
            int inputTokens = usage != null ? ((Number) usage.getOrDefault("input_tokens", 0)).intValue() : 0;
            int outputTokens = usage != null ? ((Number) usage.getOrDefault("output_tokens", 0)).intValue() : 0;

            return new AiCompletionResult(text, inputTokens, outputTokens);
        } catch (RestClientException e) {
            throw new AiProviderException("Anthropic request failed: " + safeMessage(e), e);
        }
    }

    private static String safeMessage(Exception e) {
        String message = e.getMessage();
        return message == null ? "unknown error" : message;
    }
}
