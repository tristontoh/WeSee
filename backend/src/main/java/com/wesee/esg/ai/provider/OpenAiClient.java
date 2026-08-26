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

/** Calls OpenAI's Chat Completions API (https://api.openai.com/v1/chat/completions) directly — no SDK. */
@Service
public class OpenAiClient implements AiProviderClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiClient.class);

    private static final String API_URL = "https://api.openai.com/v1/chat/completions";
    private static final int MAX_TOKENS = 1536;

    private final RestClient restClient;

    public OpenAiClient() {
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
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                )
        );

        try {
            Map<String, Object> response = restClient.post()
                    .uri(API_URL)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null) {
                throw new AiProviderException("OpenAI returned an empty response");
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            String text = "";
            if (choices != null && !choices.isEmpty()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                // content is null on a refusal or a length-capped reply that only carries a tool call.
                text = message != null ? textOrEmpty(message.get("content")) : "";
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> usage = (Map<String, Object>) response.get("usage");
            int inputTokens = usage != null ? ((Number) usage.getOrDefault("prompt_tokens", 0)).intValue() : 0;
            int outputTokens = usage != null ? ((Number) usage.getOrDefault("completion_tokens", 0)).intValue() : 0;

            return new AiCompletionResult(text, inputTokens, outputTokens);
        } catch (RestClientException e) {
            // Never the provider's own message: Spring embeds the request URI and body in it, and
            // this string reaches the browser and is persisted into ai_usage_log. Same rule
            // GeminiClient states explicitly.
            String status = e instanceof HttpStatusCodeException httpEx ? " (HTTP " + httpEx.getStatusCode().value() + ")" : "";
            log.warn("OpenAI request failed{}: {}", status, e.getClass().getSimpleName());
            throw new AiProviderException("OpenAI request failed" + status + " — check that your API key and model name are correct", e);
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
