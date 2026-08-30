/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai;

/** The company's AI provider config with the API key decrypted in-memory — never serialized into any DTO or logged. */
public record DecryptedAiProviderConfig(AiProvider provider, String model, String apiKey) {
}
