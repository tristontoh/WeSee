package com.wesee.esg.ai.provider;

/** One implementation per {@link com.wesee.esg.ai.AiProvider}, dispatched via {@link AiProviderClientFactory}. */
public interface AiProviderClient {
    AiCompletionResult complete(String apiKey, String model, String systemPrompt, String userPrompt);
}
