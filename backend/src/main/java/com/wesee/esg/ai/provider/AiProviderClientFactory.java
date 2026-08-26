package com.wesee.esg.ai.provider;

import com.wesee.esg.ai.AiProvider;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/** Central dispatch from {@link AiProvider} to the concrete client — callers never see the 3 concrete classes. */
@Component
public class AiProviderClientFactory {

    private final Map<AiProvider, AiProviderClient> clients = new EnumMap<>(AiProvider.class);

    public AiProviderClientFactory(AnthropicClient anthropicClient, OpenAiClient openAiClient, GeminiClient geminiClient) {
        clients.put(AiProvider.ANTHROPIC, anthropicClient);
        clients.put(AiProvider.OPENAI, openAiClient);
        clients.put(AiProvider.GEMINI, geminiClient);
    }

    public AiProviderClient forProvider(AiProvider provider) {
        AiProviderClient client = clients.get(provider);
        if (client == null) {
            throw new AiProviderException("Unsupported AI provider: " + provider);
        }
        return client;
    }
}
